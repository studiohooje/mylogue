import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve('..'),skill='C:/Users/moonh/.codex/plugins/cache/openai-primary-runtime/presentations/26.1117.12345/skills/presentations';
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools','artifact_tool_utils.mjs')).href);
const result=await finalizePresentation({
 workspaceDir:root,
 candidatePath:path.join(root,'deck-final','MWL_Beta_2_0_Business_Plan_SUIT_Embedded.pptx'),
 finalPath:path.join(root,'deck-final','MWL_Beta_2_0_Business_Plan_SUIT_Validated_v2.pptx'),
 pythonExecutable:'C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1117-1425-0_26.1117.1425.0_x64__3k8sg7r9htsxt/dependencies/python/python.exe',
 integrityValidatorPath:path.join(skill,'container_tools','inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(skill,'container_tools','inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],
 fontPolicy:{basis:'design',families:['SUIT']},
 verifyArtifactToolImport:true,
 receiptPath:path.join(root,'deck-build','suit-embedded-validation-v2.json')
});
console.log(result);
