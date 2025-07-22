#!/bin/bash

# Claude wrapper with automatic tracking
TRACKER_DAEMON="/home/mdomichard@oceanie.intranet.degetel.com/claude-tracker-daemon.py"
ORIGINAL_CLAUDE="/home/mdomichard@oceanie.intranet.degetel.com/.npm-global/bin/claude-original"

# Special commands
if [ "$1" = "--show-usage" ]; then
    python3 "$TRACKER_DAEMON" track-show
    exit 0
elif [ "$1" = "--reset-session" ]; then
    python3 "$TRACKER_DAEMON" track-reset
    exit 0
fi

# Store input
USER_INPUT="$*"

# Run original Claude and capture output
CLAUDE_OUTPUT=$($ORIGINAL_CLAUDE "$@" 2>&1)
EXIT_CODE=$?

# Print Claude's output normally
echo "$CLAUDE_OUTPUT"

# If successful and we have both input and output, track it
if [ $EXIT_CODE -eq 0 ] && [ -n "$USER_INPUT" ] && [ -n "$CLAUDE_OUTPUT" ]; then
    # Track usage
    python3 "$TRACKER_DAEMON" track-add "$USER_INPUT" "$CLAUDE_OUTPUT" 2>/dev/null
fi

exit $EXIT_CODE