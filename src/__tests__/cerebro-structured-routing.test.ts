import assert from 'node:assert/strict';
import test from 'node:test';
import { structuredOpenRouterModels } from '@/lib/cerebro-v2/provider-selection';

test('structured default has an explicit multimodal free model before the free router',()=>{
    assert.deepEqual(structuredOpenRouterModels('openrouter/free'),['google/gemma-4-31b-it:free','openrouter/free']);
});
test('an explicitly configured model keeps precedence without duplicate calls',()=>{
    assert.deepEqual(structuredOpenRouterModels('configured/model'),['configured/model','google/gemma-4-31b-it:free','openrouter/free']);
    assert.equal(new Set(structuredOpenRouterModels('google/gemma-4-31b-it:free')).size,2);
});
