import routing from "@novice1/routing";
import { Options } from "ajv";

declare global {
  namespace NoviceRouting {
    interface MetaParameters {
        onerror?: routing.ErrorRequestHandler,
        validatorJsonOptions?: Options
    }
  }
}

export {}