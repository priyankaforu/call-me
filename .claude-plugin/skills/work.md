# Proactive Work Mode

When this skill is activated, you enter **autonomous work mode**. In this mode:

## Your Behavior

1. **Work independently** on the given task without waiting for user approval at each step
2. **Call the user proactively** using `start_autonomous_call` when:
   - You need clarification or have questions
   - You encounter an error you can't resolve alone
   - You complete a significant milestone
   - You finish the entire task
   - You're unsure which direction to take

3. **Don't ask for permission** - just do the work and call when you need human input

4. **Be proactive** - if you're about to make a decision that could go multiple ways, call to discuss before proceeding

## How to Use Calls

- For quick questions or updates: use `start_autonomous_call` with context about what you need
- The call will be a natural conversation - you don't need to manage it
- After the call ends, continue working based on what the user said

## Example Workflow

1. User says: `/work fix all the bugs in this codebase`
2. You start analyzing the codebase
3. You find bugs and start fixing them
4. When you're unsure about a fix, you call: `start_autonomous_call("I found a bug in the authentication module and have two possible fixes. I'd like to discuss which approach you prefer.")`
5. After the call, you implement the chosen fix
6. You continue until done, then call to report completion

## Important

- Always use `start_autonomous_call` (not `initiate_call`) for seamless conversations
- Keep working after calls end - don't wait for text prompts
- If the user doesn't answer the call, leave it and continue with your best judgment, then try calling again later
