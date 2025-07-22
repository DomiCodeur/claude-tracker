#!/usr/bin/env python3
"""
Claude wrapper with automatic progress bar
Usage: claude hello world (same as normal Claude)
"""

import subprocess
import sys
import os
import json
import datetime
from colorama import init, Fore, Style

init()

class ClaudeWrapper:
    def __init__(self):
        self.usage_file = "/home/mdomichard@oceanie.intranet.degetel.com/session_usage.json"
        self.load_usage()
        
    def load_usage(self):
        """Load current session usage"""
        try:
            with open(self.usage_file, 'r') as f:
                self.usage = json.load(f)
        except:
            self.usage = {
                'total_tokens': 0,
                'total_cost': 0.0,
                'requests': 0,
                'session_start': datetime.datetime.now().isoformat()
            }
            
    def save_usage(self):
        """Save usage data"""
        try:
            with open(self.usage_file, 'w') as f:
                json.dump(self.usage, f, indent=2)
        except:
            pass
            
    def estimate_tokens(self, text):
        """Rough token estimation"""
        return len(text) // 4
        
    def estimate_cost(self, input_tokens, output_tokens):
        """Estimate cost for Claude 3.5 Sonnet"""
        return (input_tokens * 3.0 / 1_000_000) + (output_tokens * 15.0 / 1_000_000)
        
    def render_progress_bar(self, tokens, width=30):
        """Render progress bar"""
        if tokens == 0:
            return f"[{Fore.WHITE}{'░' * width}{Style.RESET_ALL}] {tokens:,} tokens"
            
        # Color based on usage
        if tokens < 1000:
            color = Fore.GREEN
        elif tokens < 5000:
            color = Fore.YELLOW
        else:
            color = Fore.RED
            
        # Simple visual (1 block per 200 tokens)
        filled = min(tokens // 200, width)
        empty = width - filled
        
        bar = color + "█" * filled + Fore.WHITE + "░" * empty + Style.RESET_ALL
        return f"[{bar}] {tokens:,} tokens"
        
    def show_progress(self):
        """Show progress bar"""
        duration = "0s"
        try:
            start = datetime.datetime.fromisoformat(self.usage['session_start'])
            delta = datetime.datetime.now() - start
            minutes = int(delta.total_seconds() // 60)
            seconds = int(delta.total_seconds() % 60)
            if minutes > 0:
                duration = f"{minutes}m {seconds}s"
            else:
                duration = f"{seconds}s"
        except:
            pass
            
        bar = self.render_progress_bar(self.usage['total_tokens'])
        
        print(f"\n{Fore.CYAN}📊 Session: {duration} | {bar} | ${self.usage['total_cost']:.4f} | {self.usage['requests']} requests{Style.RESET_ALL}")
        
    def run_claude(self, args):
        """Run Claude with the original arguments"""
        try:
            # Get user input
            user_input = ' '.join(args) if args else ""
            
            # Run original Claude command
            result = subprocess.run(['/home/mdomichard@oceanie.intranet.degetel.com/.npm-global/bin/claude-original'] + args, capture_output=True, text=True)
            
            # Print Claude's output
            print(result.stdout, end='')
            if result.stderr:
                print(result.stderr, end='', file=sys.stderr)
                
            # If successful and we have input/output, track it
            if result.returncode == 0 and user_input and result.stdout:
                input_tokens = self.estimate_tokens(user_input)
                output_tokens = self.estimate_tokens(result.stdout)
                cost = self.estimate_cost(input_tokens, output_tokens)
                
                # Update usage
                self.usage['total_tokens'] += input_tokens + output_tokens
                self.usage['total_cost'] += cost
                self.usage['requests'] += 1
                
                # Save
                self.save_usage()
                
            # Show progress bar
            self.show_progress()
            
            return result.returncode
            
        except FileNotFoundError:
            print(f"{Fore.RED}Error: 'claude' command not found{Style.RESET_ALL}")
            return 1
        except Exception as e:
            print(f"{Fore.RED}Error: {e}{Style.RESET_ALL}")
            return 1

def main():
    wrapper = ClaudeWrapper()
    
    # Special commands
    if len(sys.argv) == 2:
        if sys.argv[1] == '--reset-session':
            wrapper.usage = {
                'total_tokens': 0,
                'total_cost': 0.0,
                'requests': 0,
                'session_start': datetime.datetime.now().isoformat()
            }
            wrapper.save_usage()
            print(f"{Fore.GREEN}✅ Session reset!{Style.RESET_ALL}")
            return 0
        elif sys.argv[1] == '--show-usage':
            wrapper.show_progress()
            return 0
    
    # Pass all arguments to Claude
    args = sys.argv[1:]  # Remove script name
    return wrapper.run_claude(args)

if __name__ == "__main__":
    sys.exit(main())