import React, { useRef, useEffect } from 'react';
import { editorPageIdInitAtom, textEditorDoenetMLAtom, updateTextEditorDoenetMLAtom, viewerDoenetMLAtom } from '../ToolPanels/EditorViewer'
import {
  atom,
  useRecoilValue,
  // useRecoilState,
  useSetRecoilState,
  // atom,
  useRecoilCallback,
} from 'recoil';
import { searchParamAtomFamily } from '../NewToolRoot';

import CodeMirror from '../CodeMirror';
import axios from "axios";
import { fileByPageId } from '../ToolHandlers/CourseToolHandler';
import { courseIdAtom } from '../../../_reactComponents/Course/CourseActions';

export function useSaveDraft(){
  const saveDraft = useRecoilCallback(({ snapshot, set }) => async ({pageId, courseId, backup=false}) => {
    const doenetML = await snapshot.getPromise(textEditorDoenetMLAtom);
  
    //Save in localStorage
    // localStorage.setItem(cid,doenetML)
  
    try {
      const params = {
        doenetML,
        pageId,
        courseId,
        backup,
      }
      const { data } = await axios.post("/api/saveDoenetML.php", params);
      set(fileByPageId(pageId),doenetML);
      if (!data.success) {
      //   //TODO: Toast here
        console.log("ERROR", data.message)
      }
      return {success:data.success};
  
    } catch (error) {
      console.log("ERROR", error)
      return {success:false};
    }
  
  
  }, []);

  return { saveDraft }
}


export default function DoenetMLEditor() {
  // console.log(">>>===DoenetMLEditor")

  // const [editorDoenetML,setEditorDoenetML] = useRecoilState(textEditorDoenetMLAtom);
  const setEditorDoenetML = useSetRecoilState(textEditorDoenetMLAtom);
  const updateInternalValue = useRecoilValue(updateTextEditorDoenetMLAtom);
  const viewerDoenetML = useRecoilValue(viewerDoenetMLAtom)
  const paramPageId = useRecoilValue(searchParamAtomFamily('pageId'))
  const paramlinkPageId = useRecoilValue(searchParamAtomFamily('linkPageId'))
  let effectivePageId = paramPageId;
  let readOnly = false;
  if (paramlinkPageId){
    readOnly = true;
    effectivePageId = paramlinkPageId
  }
  const courseId = useRecoilValue(courseIdAtom)
  
  const initializedPageId = useRecoilValue(editorPageIdInitAtom);
  let editorRef = useRef(null);
  let timeout = useRef(null);
  let backupOldDraft = useRef(true);

  const { saveDraft } = useSaveDraft();

  

  // save draft when leave page
  useEffect(() => {
    return () => {
      if (initializedPageId !== "") {
        // save and stop timers
        saveDraft({pageId:initializedPageId, courseId, backup:backupOldDraft.current})
        if (timeout.current !== null) {
          clearTimeout(timeout.current)
        }
        timeout.current = null;
      }
    }
  }, [initializedPageId, saveDraft, courseId])

  // save draft when click the update button
  useEffect(() => {
    if (initializedPageId !== "") {
      // save and stop timers
      saveDraft({pageId:initializedPageId, courseId, backup:backupOldDraft.current}).then(({success})=>{
        if (success){
          backupOldDraft.current = false;
        }
      })
      
      if (timeout.current !== null) {
        clearTimeout(timeout.current)
      }
      timeout.current = null;
    }
  }, [viewerDoenetML])


  if (effectivePageId !== initializedPageId) {
    //DoenetML is changing to another PageId
    backupOldDraft.current = true;
    return null;
  }

  // console.log(`>>>Show CodeMirror with value -${updateInternalValue}-`)
  return <div><CodeMirror
    key="codemirror"
    readOnly={readOnly}
    editorRef={editorRef}
    setInternalValue={updateInternalValue}
    // value={editorDoenetML} 
    onBeforeChange={(value) => {
      setEditorDoenetML(value);
      // Debounce save to server at 3 seconds
      clearTimeout(timeout.current);

      timeout.current = setTimeout(function () {
        saveDraft({pageId:initializedPageId, courseId, backup:backupOldDraft.current}).then(({success})=>{
          if (success){
            backupOldDraft.current = false;
          }
        })

        timeout.current = null;
      }, 3000)//3 seconds
    }}
  />
  </div>
}