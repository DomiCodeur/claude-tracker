#!/bin/bash
cd "$(dirname "$0")/.."
source python-version/claude_env/bin/activate
python python-version/claude-with-progress.py