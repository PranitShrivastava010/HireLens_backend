import "dotenv/config";
import app from "./src/app";

export const startServer = () => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`HireLens API running on port ${PORT}`);
  });
};