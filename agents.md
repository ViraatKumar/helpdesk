# AI Agent Instructions

Agents must commit code after every task and follow the rules defined below

## 1. Commit Message Formatting

All commits must follow a clean, structured, and readable format based on Conventional Commits, followed by a bulleted list detailing the specific changes. 

**Rules:**
- **Header:** `<type>(<scope>): <short summary>`
- **Body:** Leave one blank line after the header, then provide a bulleted list (`-`) of the changes. 
- **Detail:** Focus on *what* changed and *why*. Group related changes logically.
- **Line Length:** Wrap body text at roughly 72 characters for readability in terminal logs.

**Gold Standard Example:**

```text
feat(pages): branded landing, auth, help center, and widget surfaces

- Reusable BrandMark (LifeBuoy on primary) heads the auth/onboarding cards
  and links back home.
- Landing page becomes a real hero: brand lockup, balanced headline, subtle
  primary radial glow, and a feature strip with icons.
- Public help center gets a hero band (workspace eyebrow, "How can we
  help?", centered search), card-style article rows with hover lift, a
  result count for searches, and a Powered-by footer.
- Widget header gains a workspace avatar with an online-status dot.