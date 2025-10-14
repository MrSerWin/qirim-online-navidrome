import React, { useState } from 'react'
import {
  Filter,
  SearchInput,
  Pagination,
  useTranslate,
} from 'react-admin'
import { withWidth } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import { List, Title } from '../common'
import KaraokeGridView from './KaraokeGridView'

const useStyles = makeStyles({
  searchComponent: {
    width: '100%',
  },
  filterComponent: {
    width: '100%',
    marginLeft: '10px',
    '& .filter-field': {
      width: '100%',
    },
  },
  actionsContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '16px',
  },
})

const KaraokeFilter = (props) => {
  const classes = useStyles()
  return (
    <Filter {...props} variant={'outlined'} className={classes.filterComponent}>
      <SearchInput
        id="search"
        source="q"
        alwaysOn
        className={classes.searchComponent}
        placeholder="Search title or artist"
      />
    </Filter>
  )
}

const KaraokeListTitle = () => {
  const translate = useTranslate()
  const title = translate('resources.karaoke.name', { smart_count: 2 })
  return <Title subTitle={title} args={{ smart_count: 2 }} />
}

const KaraokeList = (props) => {
  const { width } = props

  return (
    <>
      <List
        {...props}
        exporter={false}
        bulkActionButtons={false}
        filters={<KaraokeFilter />}
        perPage={24}
        pagination={<Pagination rowsPerPageOptions={[12, 24, 48, 96]} />}
        title={<KaraokeListTitle />}
        sort={{ field: 'createdAt', order: 'DESC' }}
      >
        <KaraokeGridView width={width} />
      </List>
    </>
  )
}

const KaraokeListWithWidth = withWidth()(KaraokeList)

export default KaraokeListWithWidth
