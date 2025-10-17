import React, { useEffect } from 'react'
import {
  Create,
  SimpleForm,
  TextInput,
  BooleanInput,
  required,
  useTranslate,
  useRefresh,
  useNotify,
  useRedirect,
  usePermissions,
} from 'react-admin'
import { Title } from '../common'

const PlaylistCreate = (props) => {
  const { basePath } = props
  const refresh = useRefresh()
  const notify = useNotify()
  const redirect = useRedirect()
  const translate = useTranslate()
  const { permissions } = usePermissions()
  const resourceName = translate('resources.playlist.name', { smart_count: 1 })
  const title = translate('ra.page.create', {
    name: `${resourceName}`,
  })

  // Redirect guests to playlist list
  useEffect(() => {
    if (permissions === 'guest') {
      notify('ra.notification.logged_out', 'warning')
      redirect('/playlist')
    }
  }, [permissions, notify, redirect])

  const onSuccess = () => {
    notify('ra.notification.created', 'info', { smart_count: 1 })
    redirect('list', basePath)
    refresh()
  }

  return (
    <Create title={<Title subTitle={title} />} {...props} onSuccess={onSuccess}>
      <SimpleForm redirect="list" variant={'outlined'}>
        <TextInput source="name" validate={required()} />
        <TextInput multiline source="comment" />
        <BooleanInput source="public" initialValue={true} />
      </SimpleForm>
    </Create>
  )
}

export default PlaylistCreate
