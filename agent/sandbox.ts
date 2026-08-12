import { defineSandbox } from "eve/sandbox";
import { justbash } from "eve/sandbox/just-bash";

// Local, container-free execution: this machine has no docker. The lab's
// tools are in-memory fixture operations, so full isolation adds nothing.
export default defineSandbox({
  backend: justbash(),
});
