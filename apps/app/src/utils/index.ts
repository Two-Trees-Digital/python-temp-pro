// TT-118: generateAuthToken moved to packages/auth (both apps' copies were
// byte-identical). Re-exporting here keeps existing `import { generateAuthToken }
// from "@/utils"` call sites working without churn.

export { generateAuthToken } from "auth";
