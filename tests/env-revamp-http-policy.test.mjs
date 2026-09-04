import assert from "node:assert/strict";
import test from "node:test";

import { unexpectedHttpResponses } from "../tools/runtime-http-policy.mjs";

test("the environment runtime audit fails a missing same-origin texture", () => {
  const failures = unexpectedHttpResponses(
    [
      {
        status: 404,
        url: "http://127.0.0.1:3000/playcanvas/chapter-1/assets/textures/missing.webp",
        type: "Image",
      },
      {
        status: 404,
        url: "http://127.0.0.1:3000/favicon.ico",
        type: "Other",
      },
      {
        status: 503,
        url: "https://unrelated.invalid/telemetry",
        type: "Fetch",
      },
    ],
    { pageOrigin: "http://127.0.0.1:3000" },
  );

  assert.deepEqual(failures, [
    {
      status: 404,
      url: "http://127.0.0.1:3000/playcanvas/chapter-1/assets/textures/missing.webp",
      type: "Image",
    },
  ]);
});
