type MonacoLanguageSelectionType = {
  editorLanguage: string;
  lspLanguage: string
}

export default function selectLanguageForEndpoint(endpoint: string) : MonacoLanguageSelectionType
{
  const fileExtension = endpoint.split(".").slice(-1)

  var editorLanguage: string
  var lspLanguage: string
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
  //console.log("ext: " + fileExtension.join() + " lsp: " + lspLanguage + " editor: " + editorLanguage)
  return { 'editorLanguage': editorLanguage, 'lspLanguage': lspLanguage} as MonacoLanguageSelectionType
}
