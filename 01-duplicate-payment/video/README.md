# Video

Remotion composition driven by the same lab result returned by the backend.

```bash
npm install
npm run studio
```

Capture a live idempotent run and render it:

```bash
npm run capture
npm run render
```

Set `MODE=unprotected` or `MODE=database-constraint` when capturing another mode.

Publish the English 15-second execution animation and poster directly into the
visual lesson. The animation shows a primary-key insert selecting one owner,
then adds persisted state and response replay to form the full idempotency
workflow:

```bash
npm run publish:visual
```
