import { faLink } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useState } from 'react';
import { useRecoilCallback, useRecoilValue, useSetRecoilState } from 'recoil';
import { itemByDoenetId, selectedCourseItems, useCourse } from '../../../_reactComponents/Course/CourseActions';
import { pageToolViewAtom, searchParamAtomFamily } from '../NewToolRoot';
import ActionButton from '../../../_reactComponents/PanelHeaderComponents/ActionButton';
import ActionButtonGroup from '../../../_reactComponents/PanelHeaderComponents/ActionButtonGroup';
import Textfield from '../../../_reactComponents/PanelHeaderComponents/Textfield';
import axios from 'axios';
import Button from '../../../_reactComponents/PanelHeaderComponents/Button';


export default function SelectedPageLink() {
  const setPageToolView = useSetRecoilState(pageToolViewAtom);
  const courseId = useRecoilValue(searchParamAtomFamily('courseId'));
  const doenetId = useRecoilValue(selectedCourseItems)[0];
  const pageObj = useRecoilValue(itemByDoenetId(doenetId));
  const [itemTextFieldLabel,setItemTextFieldLabel] = useState(pageObj.label)
  let { updateContentLinksToSources } = useCourse(courseId);
  

  const renamePageLink = useRecoilCallback(({set})=>async (courseId,doenetId,label)=>{
    const { data } = await axios.get('/api/renamePageLink.php',{params:{courseId,doenetId,label}})
    // console.log("data",data)
    set(itemByDoenetId(doenetId),(prev)=>{
      let next = {...prev}
      next.label = label
      return next
    })
  })

  useEffect(()=>{
    if (itemTextFieldLabel !== pageObj.label){
      setItemTextFieldLabel(pageObj.label)
    }
  },[doenetId]) //Only check when the pageId changes

  let heading = (<h2 data-test="infoPanelItemLabel" style={{ margin: "16px 5px" }} >
    <FontAwesomeIcon icon={faLink} /> {pageObj.label} 
  </h2>)

  function handleLabelModfication(){
    renamePageLink(courseId,doenetId,itemTextFieldLabel);
  }

  
  return <>
  {heading}
  <ActionButtonGroup vertical>
  <ActionButton
          width="menu"
          value="View Page Link"
          onClick={() => {
            setPageToolView({
              page: 'course',
              tool: 'editor',
              view: '',
              params: {
                linkPageId:doenetId,
              },
            });
          }}
        />
  </ActionButtonGroup>
  <Textfield
      label="Label"
      vertical
      width="menu"
      value={itemTextFieldLabel}
      onChange={(e) => setItemTextFieldLabel(e.target.value)}
      onKeyDown={(e) => {
        if (e.keyCode === 13) handleLabelModfication();
      }}
      onBlur={handleLabelModfication}
    />
  <br />
  <br />
    <Button
    width="menu"
    value="Update Content to Source"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      updateContentLinksToSources({pages:[doenetId]});
    }}
    />

  </>
}
