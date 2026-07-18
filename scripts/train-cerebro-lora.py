"""Train Cerebro's text-repair QLoRA while preserving Qwen's vision encoder."""

from __future__ import annotations

import math
import os
from collections.abc import Mapping
from typing import TypedDict, cast

from unsloth import FastLanguageModel
from datasets import Dataset, load_dataset
from transformers import DataCollatorForSeq2Seq, Trainer, TrainingArguments

MODEL_NAME = "Qwen/Qwen3.6-27B"
DATASET_PATH = "/data/train.jsonl"
OUTPUT_ROOT = "/output"
MAX_LENGTH = 1536


class Message(TypedDict):
    role: str
    content: str


class TokenizedExample(TypedDict):
    input_ids: list[int]
    attention_mask: list[int]
    labels: list[int]


def _text_tokenizer(processor: object) -> object:
    """Return the language tokenizer instead of TRL's vision processor."""
    return getattr(processor, "tokenizer", processor)


def _tokenize_example(example: Mapping[str, object], tokenizer: object) -> TokenizedExample:
    messages = cast(list[Message], example["messages"])
    if len(messages) < 2 or messages[-1]["role"] != "assistant":
        raise ValueError("Each training example must end with an assistant response")

    apply_chat_template = getattr(tokenizer, "apply_chat_template")
    tokenize = cast(object, tokenizer)
    full_text = apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
    prompt_text = apply_chat_template(messages[:-1], tokenize=False, add_generation_prompt=True)
    full_tokens = tokenize(full_text, truncation=True, max_length=MAX_LENGTH, add_special_tokens=False)
    prompt_tokens = tokenize(prompt_text, truncation=True, max_length=MAX_LENGTH, add_special_tokens=False)
    input_ids = list(full_tokens["input_ids"])
    attention_mask = list(full_tokens["attention_mask"])
    prompt_length = min(len(prompt_tokens["input_ids"]), len(input_ids))
    labels = ([-100] * prompt_length) + input_ids[prompt_length:]
    if not input_ids or all(label == -100 for label in labels):
        raise ValueError("Training example has no assistant tokens after truncation")
    return {"input_ids": input_ids, "attention_mask": attention_mask, "labels": labels}


def _finite_loss(metrics: Mapping[str, object]) -> None:
    loss = metrics.get("train_loss")
    if not isinstance(loss, (int, float)) or not math.isfinite(float(loss)):
        raise RuntimeError(f"Training did not produce a finite loss: {loss!r}")


def main() -> None:
    smoke_test = os.getenv("CEREBRO_LORA_SMOKE_TEST") == "1"
    output_dir = f"{OUTPUT_ROOT}/cerebro-lora-qwen36-smoke" if smoke_test else f"{OUTPUT_ROOT}/cerebro-lora-qwen36"
    model, processor = FastLanguageModel.from_pretrained(
        model_name=MODEL_NAME,
        max_seq_length=MAX_LENGTH,
        load_in_4bit=True,
        use_gradient_checkpointing="unsloth",
    )
    model = FastLanguageModel.get_peft_model(
        model,
        r=16,
        lora_alpha=32,
        lora_dropout=0,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=42,
    )
    tokenizer = _text_tokenizer(processor)
    raw_dataset = cast(Dataset, load_dataset("json", data_files=DATASET_PATH, split="train"))
    if smoke_test:
        raw_dataset = raw_dataset.select(range(min(2, len(raw_dataset))))
    tokenized = raw_dataset.map(
        lambda example: _tokenize_example(example, tokenizer),
        remove_columns=raw_dataset.column_names,
        desc="Tokenizing repair examples",
    )
    split = tokenized.train_test_split(test_size=1 if smoke_test else 0.1, seed=42)
    collator = DataCollatorForSeq2Seq(
        tokenizer=tokenizer,
        model=None,
        padding=True,
        label_pad_token_id=-100,
        return_tensors="pt",
    )
    trainer = Trainer(
        model=model,
        processing_class=tokenizer,
        train_dataset=split["train"],
        eval_dataset=None if smoke_test else split["test"],
        data_collator=collator,
        args=TrainingArguments(
            output_dir=output_dir,
            max_steps=1 if smoke_test else -1,
            num_train_epochs=1 if smoke_test else 2,
            per_device_train_batch_size=1,
            gradient_accumulation_steps=1 if smoke_test else 8,
            learning_rate=1e-4,
            logging_steps=1 if smoke_test else 5,
            eval_strategy="no" if smoke_test else "steps",
            eval_steps=None if smoke_test else 25,
            save_strategy="no" if smoke_test else "steps",
            save_steps=25,
            save_total_limit=2,
            bf16=True,
            optim="adamw_8bit",
            report_to="none",
            seed=42,
        ),
    )
    result = trainer.train()
    _finite_loss(result.metrics)
    trainer.save_model(output_dir)
    getattr(processor, "save_pretrained")(output_dir)


if __name__ == "__main__":
    main()
