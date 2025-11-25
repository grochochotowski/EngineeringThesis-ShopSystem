# Repository Guidelines

## Project Structure & Module Organization
- Backend API: `src/backend/Backend.Api` (ASP.NET Core 8) with controllers, services, DTOs, EF Core entities/migrations, and `appsettings*.json` for connection string/JWT. The `.http` file is for quick API probing.
- Frontend: `src/frontend` (React + Vite) with components/pages under `src/`, styles under `src/styles`, and API client in `src/api/apiClient.js`.
- Desktop: `src/desktop/Desktop` (WPF, net8.0-windows). Release build runs the React build and copies `dist/` into the desktop output (`ui/`).
- Documentation: `project-documentation/` and `functionalities-documentation/` capture feature notes; keep them updated alongside code changes.

## Build, Test, and Development Commands
- Backend: `dotnet restore src/backend/Backend.Api/Backend.Api.sln`; `dotnet build src/backend/Backend.Api/Backend.Api.csproj`; `dotnet run --project src/backend/Backend.Api/Backend.Api.csproj`. Apply migrations when needed: `dotnet ef database update` (install EF CLI first).
- Frontend: from `src/frontend`, `npm install`; `npm run dev` for Vite dev server; `npm run build` for production bundle; `npm run lint` to enforce ESLint rules.
- Desktop: `dotnet restore src/desktop/Desktop/Desktop.sln`; `dotnet build src/desktop/Desktop/Desktop.csproj -c Release` to produce the packaged app (includes frontend build); `dotnet run --project src/desktop/Desktop/Desktop.csproj` for a debug run.

## Coding Style & Naming Conventions
- C#: default .NET conventions—PascalCase for classes and public members, camelCase for locals/fields, 4-space indentation. Keep controllers thin and async, push logic into services, and favor dependency injection. Name migrations with timestamps as in existing files.
- React/JS: follow ESLint config (`npm run lint`); functional components in PascalCase; hooks at top of components; prefer module-scoped helpers in camelCase. Keep CSS modules organized under existing `ComponentsStyles` and `PagesStyles` patterns.

## Testing Guidelines
- No automated test projects are present yet; add xUnit for backend and React Testing Library/Vitest for frontend as you extend functionality. Until then, exercise critical flows manually (API endpoints via `Backend.Api.http`, UI via Vite dev server or desktop app). Gate changes with `npm run lint` and `dotnet build` at minimum.

## Commit & Pull Request Guidelines
- Recent history uses short, imperative messages (e.g., “add sorting to the whole product list”). Keep commits scoped, English, and present tense. Avoid bundling backend/frontend/desktop changes in one commit unless the change is cross-cutting.
- PRs should include: purpose/issue link, summary of changes, setup notes (e.g., new env vars/migrations), test evidence (`dotnet build`, `npm run lint`, manual checks), and screenshots/gifs for UI changes. Mention doc updates when applicable.

## Security & Configuration Tips
- Do not commit real secrets. Override `appsettings.json` values (DB connection, JWT key) with environment variables or `dotnet user-secrets` in development; ensure production secrets live outside the repo. For Vite, only expose values prefixed with `VITE_`. Keep sample configs minimal and scrubbed.
