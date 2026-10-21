import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// findBy*/waitFor give up after 1s by default. Under the full suite's parallel
// load a form's transition can take longer than that to render its result, so
// tests failed only when run together (e.g. login-form's demo sign-in error).
configure({ asyncUtilTimeout: 3000 });
