export interface TimelineFollowInput {
  following: boolean
  nearBottom: boolean
  userScrollIntent: boolean
}

/** Layout/programmatic movement never cancels follow. Only a real user scroll
 * away from the bottom does; reaching the bottom always re-enables it. */
export function nextTimelineFollow(input: TimelineFollowInput): boolean {
  if (input.nearBottom) return true
  if (input.userScrollIntent) return false
  return input.following
}

export function timelineLayoutAction(following: boolean): 'scroll-bottom' | 'measure-only' {
  return following ? 'scroll-bottom' : 'measure-only'
}
