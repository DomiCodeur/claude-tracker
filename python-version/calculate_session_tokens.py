#!/usr/bin/env python3
"""
Claude Code Session Token Calculator

This script calculates the total tokens used in the current Claude Code session
and determines when the 5-hour session limit will reset.

For Claude Code Pro users with 70,000 tokens per 5-hour session.
"""

import json
import glob
import os
import datetime

def get_latest_session_file():
    """Find the most recent Claude Code session file."""
    # Get current user's home directory
    home = os.path.expanduser("~")
    
    # Common patterns for Claude Code session files
    patterns = [
        f"{home}/.claude/projects/*/*.jsonl",
        f"{home}/.claude/projects/*/conversations_*.jsonl",
        # Original pattern that was working
        f"{home}/.claude/projects/-{home.replace('/', '-')[1:]}/*.jsonl"
    ]
    
    files = []
    for pattern in patterns:
        files.extend(glob.glob(pattern))
    
    if not files:
        return None
    
    # Get most recently modified file
    latest_file = max(files, key=os.path.getmtime)
    return latest_file

def calculate_session_tokens(session_file):
    """Calculate total tokens used in a Claude Code session."""
    if not session_file or not os.path.exists(session_file):
        return 0, 0, None
    
    total_input_tokens = 0
    total_output_tokens = 0
    first_timestamp = None
    
    try:
        with open(session_file, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    data = json.loads(line.strip())
                    
                    # Extract first timestamp for session start time
                    if 'timestamp' in data and first_timestamp is None:
                        first_timestamp = data['timestamp']
                    
                    # Extract token usage from assistant messages
                    if (data.get('type') == 'assistant' and 
                        'message' in data and 
                        'usage' in data['message']):
                        
                        usage = data['message']['usage']
                        total_input_tokens += usage.get('input_tokens', 0)
                        total_output_tokens += usage.get('output_tokens', 0)
                        
                except json.JSONDecodeError:
                    continue
                    
    except Exception as e:
        print(f"Error reading session file: {e}")
        return 0, 0, None
    
    return total_input_tokens, total_output_tokens, first_timestamp

def calculate_reset_time(first_timestamp):
    """Calculate when the 5-hour Claude Code session resets."""
    if not first_timestamp:
        return None, None
    
    try:
        # Parse ISO timestamp from session start
        start_time = datetime.datetime.fromisoformat(first_timestamp.replace('Z', '+00:00'))
        reset_time = start_time + datetime.timedelta(hours=5)
        now = datetime.datetime.now(datetime.timezone.utc)
        
        if now >= reset_time:
            return None, None  # Session already reset
            
        time_remaining = reset_time - now
        hours = int(time_remaining.total_seconds() // 3600)
        minutes = int((time_remaining.total_seconds() % 3600) // 60)
        
        return hours, minutes
        
    except Exception as e:
        print(f"Error calculating reset time: {e}")
        return None, None

def main():
    """Main function to calculate and output session token usage."""
    session_file = get_latest_session_file()
    if not session_file:
        print("0|0|0|No session found")
        return
    
    input_tokens, output_tokens, first_timestamp = calculate_session_tokens(session_file)
    
    hours, minutes = calculate_reset_time(first_timestamp)
    
    if hours is not None and minutes is not None:
        reset_info = f"{hours}h {minutes}min"
    else:
        reset_info = "Reset available"
    
    # Output format: input_tokens|output_tokens|total_tokens|reset_info
    print(f"{input_tokens}|{output_tokens}|{input_tokens + output_tokens}|{reset_info}")

if __name__ == "__main__":
    main()