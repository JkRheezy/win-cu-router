/** Uses a host-provided sky object. No official runtime is imported or bundled. */
export function createSkyExecutor({sky,window,calibration}) {
  if(typeof sky?.click!=='function'||!window?.id||!calibration)throw new Error('A host-provided sky window and inspected calibration are required');
  const reference=structuredClone(calibration);
  return {async execute(action,snapshot) {
    const local=snapshot.binding,b=local?.bounds,r=reference.bounds;
    if(local?.windowId!==window.id||!b||['x','y','width','height'].some(k=>b[k]!==r[k]))throw new Error('Window changed; observe and recalibrate');
    const rect=action.binding?.rect;
    if(action.kind!=='click'||!rect||!['x','y','w','h'].every(k=>Number.isFinite(rect[k]))||rect.w<=0||rect.h<=0)throw new Error('Invalid click rectangle');
    const x=(rect.x+rect.w/2-b.x)*reference.imageWidth/b.width;
    const y=(rect.y+rect.h/2-b.y)*reference.imageHeight/b.height;
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=reference.imageWidth||y>=reference.imageHeight)throw new Error('Click outside calibrated window');
    await sky.click({window,x,y});
  }};
}

export function calibrationFrom(snapshot, screenshot) {
  const bounds=snapshot.binding?.bounds;
  if(!bounds||bounds.width<=0||bounds.height<=0||screenshot.originX!==bounds.x||screenshot.originY!==bounds.y||!(screenshot.width>0)||!(screenshot.height>0)||Math.abs(screenshot.width/bounds.width-screenshot.height/bounds.height)>0.01)throw new Error('Screenshot and observer coordinate spaces do not match');
  return {bounds:{...bounds},imageWidth:screenshot.width,imageHeight:screenshot.height};
}
