## Application architecture

- Keep the marketplace in the existing TanStack Start React app; use authenticated TanStack server functions and Supabase RLS/RPC for internal actions because this host does not run Supabase Edge Functions as its application server.
- Keep marketplace roles in `public.user_roles`, separate from editable student profiles, and authorize staff actions from Supabase rather than browser state.

## Repository layout

The planned repository boundaries are:

```text
CamFlea-SE2/
  camflea-frontend/       # TanStack Start React application
  camflea-supabase/       # Supabase CLI config, migrations, seeds, and tests
  camflea-legacy/
    camflea-new-main/     # Read-only reference clone for parity and brand assets
```

- Frontend source, package scripts, Vite/TanStack configuration, and frontend tests belong under `camflea-frontend/` after the repository move.
- Supabase CLI configuration and database artifacts belong under `camflea-supabase/`. The hosted project reference remains in `camflea-supabase/config.toml`; do not replace `project_id` with the directory name.
- Run Supabase CLI commands with `--workdir camflea-supabase` or the equivalent `SUPABASE_WORKDIR` environment variable. CI must set the Supabase working directory explicitly.
- Run frontend install, lint, test, build, and dev commands with `camflea-frontend/` as the working directory. Deployment configuration must use the same frontend root.
- `camflea-legacy/camflea-new-main/` is read-only source material. Do not import it into the frontend bundle, deploy it as application code, or modify it as part of the rebuild.
- Preserve the reference application's CamFlea logo assets and color palette. Improve layout, typography, accessibility, responsiveness, and interaction quality without rebranding the product.
