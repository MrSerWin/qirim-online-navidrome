import {
  SET_NOTIFICATIONS_STATE,
  SET_OMITTED_FIELDS,
  SET_TOGGLEABLE_FIELDS,
  SET_MOBILE_PLAYER_MODE,
} from '../actions'

const initialState = {
  notifications: false,
  toggleableFields: {},
  omittedFields: {},
  mobilePlayerMode: 'mini', // 'mini' | 'full' - temporarily set to mini for testing
}

export const settingsReducer = (previousState = initialState, payload) => {
  const { type, data } = payload
  switch (type) {
    case SET_NOTIFICATIONS_STATE:
      return {
        ...previousState,
        notifications: data,
      }
    case SET_TOGGLEABLE_FIELDS:
      return {
        ...previousState,
        toggleableFields: {
          ...previousState.toggleableFields,
          ...data,
        },
      }
    case SET_OMITTED_FIELDS:
      return {
        ...previousState,
        omittedFields: {
          ...previousState.omittedFields,
          ...data,
        },
      }
    case SET_MOBILE_PLAYER_MODE:
      return {
        ...previousState,
        mobilePlayerMode: data,
      }
    default:
      return previousState
  }
}
