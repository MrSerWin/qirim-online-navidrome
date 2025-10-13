import React from 'react'
import PropTypes from 'prop-types'
import Link from '@material-ui/core/Link'
import Dialog from '@material-ui/core/Dialog'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableRow from '@material-ui/core/TableRow'
import TableCell from '@material-ui/core/TableCell'
import { humanize, underscore } from 'inflection'
import { useTranslate } from 'react-admin'
import { DialogTitle } from './DialogTitle'
import { DialogContent } from './DialogContent'

const links = {
  website: 'https://qirim.online',
  email: 'contact@qirim.online',

  // reddit: 'reddit.com/r/Qırım Online',
  // twitter: 'twitter.com/navidrome',
  // discord: 'discord.gg/xh7j7yF',
  builtOn: 'github.com/navidrome/navidrome/issues/new/choose',
  // featureRequests: 'github.com/navidrome/navidrome/discussions/new',
}

const AboutDialog = ({ open, onClose }) => {
  const translate = useTranslate()

  return (
    <Dialog
      onClose={onClose}
      aria-labelledby="about-dialog-title"
      open={open}
      fullWidth={true}
      maxWidth={'sm'}
    >
      <DialogTitle id="about-dialog-title" onClose={onClose}>
        {translate('about.title', { _: 'Qırım Online' })}
      </DialogTitle>
      <DialogContent dividers>
        <div className='multiLineText'>
          {translate('about.description')}
        </div>
        <Table aria-label={translate('menu.about')} size="small">
          <TableBody>
            {Object.keys(links).map((key) => {
              return (
                <TableRow key={key}>
                  <TableCell align="right" component="th" scope="row">
                    {translate(`about.links.${key}`, {
                      _: humanize(underscore(key)),
                    })}
                    :
                  </TableCell>
                  <TableCell align="left">
                    <Link
                      href={`https://${links[key]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {links[key]}
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  )
}

AboutDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export { AboutDialog }
