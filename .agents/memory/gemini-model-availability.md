---
name: Gemini model compatibility
description: Provider-side model availability behavior for direct Gemini API usage in KARMA AI.
---

The direct Google Gemini API can accept a valid key but reject an older model for new users, returning the currently recommended model in the provider error. Model selection should stay centralized and easy to update, and the server should log the provider status/message without exposing credentials.

**Why:** The first valid replacement key still failed until the provider-directed model update; this is a provider availability issue, not a credential issue.

**How to apply:** When a Gemini request returns a model-availability error, inspect the provider message and update the single server-side model constant before changing credentials or client code.