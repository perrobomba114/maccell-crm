#!/usr/bin/env python3
"""Aditive import of Marvel/GCD metadata into the local library catalog."""
from __future__ import annotations

import argparse
import hashlib
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


def norm(value: str | None) -> str:
    return " ".join((value or "").casefold().split())


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True)
    ap.add_argument("--target", required=True)
    ap.add_argument("--report", required=True)
    args = ap.parse_args()
    now = datetime.now(timezone.utc).isoformat()
    src = sqlite3.connect(args.source)
    src.row_factory = sqlite3.Row
    dst = sqlite3.connect(args.target)
    dst.row_factory = sqlite3.Row
    dst.execute("PRAGMA foreign_keys=ON")
    before = {t: dst.execute(f"SELECT count(*) FROM {t}").fetchone()[0] for t in (
        "editorial_series_global", "editorial_issues_global", "editorial_global_series_sources", "editorial_global_sources")}
    stats = {"series_source": 0, "series_added": 0, "series_matched": 0, "issues_source": 0,
             "issues_added": 0, "issues_matched": 0, "sources_added": 0, "conflicts": 0}
    series_map: dict[int, str] = {}
    try:
        dst.execute("BEGIN IMMEDIATE")
        marvel_series = src.execute("""
            SELECT s.*, p.name publisher, l.name language_name
            FROM gcd_series s
            JOIN gcd_publisher p ON p.id=s.publisher_id
            LEFT JOIN stddata_language l ON l.id=s.language_id
            WHERE s.deleted=0 AND lower(trim(p.name))='marvel'
        """)
        for s in marvel_series:
            stats["series_source"] += 1
            title = s["name"] or f"GCD series {s['id']}"
            sid = f"gcd-series-{s['id']}"
            existing = dst.execute("""
                SELECT series_id FROM editorial_series_global
                WHERE normalized_title=? AND coalesce(start_year,0)=coalesce(?,0)
                  AND lower(coalesce(publisher,''))='marvel'
                LIMIT 1
            """, (norm(title), s["year_began"])).fetchone()
            if existing:
                sid = existing[0]
                stats["series_matched"] += 1
            else:
                dst.execute("""
                    INSERT INTO editorial_series_global
                    (series_id,title,start_year,publisher,universe,normalized_title,source_count,first_seen,last_seen)
                    VALUES (?,?,?,?,?,?,?,?,?)
                """, (sid, title, s["year_began"], "Marvel", "Marvel", norm(title), 1, now, now))
                stats["series_added"] += 1
            series_map[s["id"]] = sid
            url = f"https://www.comics.org/series/{s['id']}/"
            dst.execute("""
                INSERT OR IGNORE INTO editorial_global_series_sources
                (series_id,source_url,source_name,evidence_text,retrieved_at,confidence)
                VALUES (?,?,?,?,?,?)
            """, (sid, url, "Grand Comics Database", f"GCD series {s['id']}; publisher=Marvel; language={s['language_name'] or 'unknown'}", now, "verified"))
            stats["sources_added"] += dst.execute("SELECT changes()").fetchone()[0]

        issues = src.execute("""
            SELECT i.*, s.name series_title, s.year_began series_start_year,
                   l.name language_name
            FROM gcd_issue i
            JOIN gcd_series s ON s.id=i.series_id
            JOIN gcd_publisher p ON p.id=s.publisher_id
            LEFT JOIN stddata_language l ON l.id=s.language_id
            WHERE i.deleted=0 AND s.deleted=0 AND lower(trim(p.name))='marvel'
        """)
        for i in issues:
            stats["issues_source"] += 1
            sid = series_map.get(i["series_id"], f"gcd-series-{i['series_id']}")
            issue_no = str(i["number"] or "").strip() or "unknown"
            volume = str(i["volume"] or "").strip() or None
            variant = str(i["variant_name"] or "").strip()
            existing = dst.execute("""
                SELECT issue_id FROM editorial_issues_global
                WHERE series_id=? AND issue_number=? AND coalesce(volume,'')=coalesce(?, '') AND variant=?
                LIMIT 1
            """, (sid, issue_no, volume, variant)).fetchone()
            if existing:
                issue_id = existing[0]
                stats["issues_matched"] += 1
            else:
                issue_id = f"gcd-issue-{i['id']}"
                dst.execute("""
                    INSERT INTO editorial_issues_global
                    (issue_id,series_id,volume,issue_number,issue_title,publication_date,publication_year,variant,language,universe,role,confidence,source_count,first_seen,last_seen)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """, (issue_id, sid, volume, issue_no, i["title"], i["publication_date"],
                       int(i["publication_date"][:4]) if i["publication_date"] and i["publication_date"][:4].isdigit() else None,
                       variant, i["language_name"] or "unknown", "Marvel", "issue", "verified", 1, now, now))
                stats["issues_added"] += 1
            url = f"https://www.comics.org/issue/{i['id']}/"
            evidence = f"GCD issue {i['id']}; Marvel; series={i['series_title']}; number={issue_no}; volume={volume or 'unknown'}"
            dst.execute("""
                INSERT OR IGNORE INTO editorial_global_sources
                (issue_id,source_url,source_name,evidence_text,retrieved_at,confidence)
                VALUES (?,?,?,?,?,?)
            """, (issue_id, url, "Grand Comics Database", evidence, now, "verified"))
            stats["sources_added"] += dst.execute("SELECT changes()").fetchone()[0]
        dst.commit()
    except Exception:
        dst.rollback()
        raise
    after = {t: dst.execute(f"SELECT count(*) FROM {t}").fetchone()[0] for t in before}
    report = {"source": str(Path(args.source)), "target": str(Path(args.target)), "filter": "publisher=Marvel",
              "integrity": dst.execute("PRAGMA integrity_check").fetchone()[0], "before": before,
              "after": after, "stats": stats}
    Path(args.report).write_text(__import__("json").dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(__import__("json").dumps(report, ensure_ascii=False))
    src.close(); dst.close()


if __name__ == "__main__":
    main()
