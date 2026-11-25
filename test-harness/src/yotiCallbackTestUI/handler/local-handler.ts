import { createApp } from "../app";
import { UI_ROOT } from "../paths";

const port = Number(process.env.PORT ?? 3000);

createApp().listen(port, () => {
  console.log(`ui listening on http://localhost:${port}${UI_ROOT}`);
});
