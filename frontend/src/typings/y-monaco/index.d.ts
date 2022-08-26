declare module 'y-monaco' {
  class MonacoBinding {
    /**
     * @param {Y.Text} ytext
     * @param {monaco.editor.ITextModel} monacoModel
     * @param {Set<monaco.editor.IStandaloneCodeEditor>} [editors]
     * @param {Awareness?} [awareness]
     */
    constructor(ytext: any, monacoModel: any, editors?: Set<any>, awareness?: any);
    doc: any;
    ytext: any;
    monacoModel: any;
    editors: Set<any>;
    mux: any;
    /**
     * @type {Map<monaco.editor.IStandaloneCodeEditor, RelativeSelection>}
     */
    _savedSelections: Map<any, RelativeSelection>;
    _beforeTransaction: () => void;
    _decorations: Map<any, any>;
    _rerenderDecorations: () => void;
    _ytextObserver: (event: any) => void;
    _monacoChangeHandler: any;
    awareness: any;
    destroy(): void;
  }
  declare class RelativeSelection {
    /**
     * @param {Y.RelativePosition} start
     * @param {Y.RelativePosition} end
     * @param {monaco.SelectionDirection} direction
     */
    constructor(start: any, end: any, direction: any);
    start: any;
    end: any;
    direction: any;
  }
}