type MonacoLanguageSelectionType = {
  editorLanguage: string;
  lspLanguage: string
}

export default function selectLanguageForEndpoint(endpoint: string) : MonacoLanguageSelectionType
{
  const fileExtension = endpoint.split(".").slice(-1)

  let editorLanguage: string
  let lspLanguage: string
  switch(fileExtension.join()) {
    case 'p4': {
        editorLanguage = "c";
        lspLanguage = "p4";
        break;
    }
    case 'py': {
        editorLanguage = lspLanguage = "python";
        break;    
    }
    case 'json': {
      editorLanguage = "json";
      lspLanguage = "";
      break;    
  }
  default: {
      editorLanguage = "";
      lspLanguage = "";
      break;
    }
  }
  return { 'editorLanguage': editorLanguage, 'lspLanguage': lspLanguage} as MonacoLanguageSelectionType
}
