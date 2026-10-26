<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the homepage as a presentation of the existing Windows RDP offering; design changes must not alter machine allocation, authentication or admin permissions.
- Define the shared visual theme in src/styles.css and load its fonts in the root head so public, account and admin pages stay consistent.
- RDP allocation requires a persisted user request and transactional service-role-only approval; all admin reads and mutations verify the encrypted admin cookie server-side before loading the privileged client.
- Keep shared availability and credential-visibility predicates in a browser-safe rules module and test them alongside database authorization tests.
