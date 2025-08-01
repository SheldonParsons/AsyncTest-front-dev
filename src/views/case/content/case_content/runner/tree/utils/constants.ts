// 树形组件配置
export const defaultProps = {
  children: 'children',
  label: 'label'
}

// 动画变体配置
export const actionBtnVariants = {
  hover: { scale: 1.1, backgroundColor: '#f0f0f0' },
  tap: { scale: 0.9 }
}

export const stepActionGroup:any = {
  for: ['copy','delete', 'addSiblingStep', 'addChildStep'],
  group: ['copy','delete', 'addSiblingStep', 'addChildStep'],
  if: ['copy','delete', 'addSiblingStep', 'addChildStep'],
  interface: ['copy','delete', 'addSiblingStep'],
  database: ['copy','delete', 'addSiblingStep'],
  error: ['copy','delete', 'addSiblingStep'],
  script: ['copy','delete', 'addSiblingStep'],
  delay: ['copy','delete', 'addSiblingStep']
}