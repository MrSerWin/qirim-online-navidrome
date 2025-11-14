import React from 'react'
import {
  Box,
  Card,
  Typography,
  makeStyles,
} from '@material-ui/core'
import { Title as PageTitle } from 'react-admin'
import { Title } from '../common/Title'

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
    maxWidth: 1200,
    margin: '0 auto',
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: theme.spacing(6, 4),
    borderRadius: theme.spacing(2),
    marginBottom: theme.spacing(4),
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: '3rem',
    fontWeight: 700,
    marginBottom: theme.spacing(1),
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)',
    [theme.breakpoints.down('sm')]: {
      fontSize: '2rem',
    },
  },
  headerSubtitle: {
    fontSize: '1.3rem',
    fontWeight: 300,
    opacity: 0.95,
    [theme.breakpoints.down('sm')]: {
      fontSize: '1.1rem',
    },
  },
  section: {
    marginBottom: theme.spacing(4),
  },
  sectionTitle: {
    fontSize: '1.8rem',
    fontWeight: 600,
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(2),
    color: theme.palette.text.primary,
  },
  card: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
    background: theme.palette.type === 'dark'
      ? 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)'
      : 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
    boxShadow: theme.palette.type === 'dark'
      ? '0 4px 20px rgba(0, 0, 0, 0.3)'
      : '0 4px 20px rgba(0, 0, 0, 0.08)',
  },
  paragraph: {
    fontSize: '1.05rem',
    marginBottom: theme.spacing(2),
    color: theme.palette.text.secondary,
    lineHeight: 1.7,
  },
  highlight: {
    background: 'linear-gradient(120deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
    padding: theme.spacing(2),
    borderRadius: theme.spacing(1),
    borderLeft: '4px solid #667eea',
    margin: theme.spacing(2, 0),
  },
  list: {
    fontSize: '1.05rem',
    color: theme.palette.text.secondary,
    lineHeight: 1.8,
    paddingLeft: theme.spacing(3),
    marginBottom: theme.spacing(2),
  },
  link: {
    color: '#667eea',
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  codeBlock: {
    background: theme.palette.type === 'dark' ? '#2d2d2d' : '#f6f8fa',
    padding: theme.spacing(2),
    borderRadius: theme.spacing(1),
    fontSize: '0.9rem',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    margin: theme.spacing(2, 0),
    color: theme.palette.text.primary,
  },
}))

const Privacy = () => {
  const classes = useStyles()

  return (
    <Box className={classes.root}>
      <PageTitle title={<Title subTitle="Privacy Policy" />} />

      <Typography className={classes.sectionTitle}>
        Privacy Policy
      </Typography>

      <Box className={classes.highlight}>
        <Typography className={classes.paragraph} style={{ marginBottom: 0, fontWeight: 600 }}>
          <strong>Summary:</strong> We collect only the data necessary to operate the service, store it securely, and provide you with control over your personal data — including the ability to delete your account via the website or by emailing <a href="mailto:contact@qirim.online" className={classes.link}>contact@qirim.online</a>.
        </Typography>
      </Box>

      {/* Section 1 */}
      <Box className={classes.section}>
        <Typography variant="h2" className={classes.sectionTitle}>
          1. Who we are
        </Typography>
        <Card className={classes.card}>
          <Typography className={classes.paragraph}>
            Qırım Online (the "Service", "we", "us", "our") provides a web interface for accessing a music catalog and related features (including karaoke). For privacy questions or requests, contact us at <a href="mailto:contact@qirim.online" className={classes.link}>contact@qirim.online</a>.
          </Typography>
        </Card>
      </Box>

      {/* Section 2 */}
      <Box className={classes.section}>
        <Typography variant="h2" className={classes.sectionTitle}>
          2. Information we collect
        </Typography>
        <Card className={classes.card}>
          <ul className={classes.list}>
            <li><strong>Registration data:</strong> email address, username, and a hashed password (we never store your password in plain text).</li>
            <li><strong>Profile data:</strong> display name, avatar (if uploaded), profile settings or preferences.</li>
            <li><strong>OAuth data:</strong> when you sign in with Google/Apple/etc., we receive the provider identifier and email (as permitted by the provider & your consent).</li>
            <li><strong>Content you add:</strong> playlists and user-contributed karaoke songs (YouTube links), and metadata such as title and artist.</li>
            <li><strong>Technical and log data:</strong> IP addresses, browser user agent, request timestamps, and server logs for diagnostics and security.</li>
            <li><strong>Cookies and tracking:</strong> cookies and analytics data to enable the app and measure usage (see Section 6).</li>
          </ul>
        </Card>
      </Box>

      {/* Section 3 */}
      <Box className={classes.section}>
        <Typography variant="h2" className={classes.sectionTitle}>
          3. How we use your data
        </Typography>
        <Card className={classes.card}>
          <ul className={classes.list}>
            <li>To operate and maintain accounts and features (authentication, storing playlists and settings).</li>
            <li>To process OAuth sign-ins and account creation.</li>
            <li>For security and fraud prevention.</li>
            <li>To improve the Service through analytics and troubleshooting.</li>
            <li>To handle support requests, including account deletion requests.</li>
          </ul>
        </Card>
      </Box>

      {/* Section 4 */}
      <Box className={classes.section}>
        <Typography variant="h2" className={classes.sectionTitle}>
          4. Legal bases for processing
        </Typography>
        <Card className={classes.card}>
          <Typography className={classes.paragraph}>
            Where applicable, we process personal data on the following bases:
          </Typography>
          <ul className={classes.list}>
            <li>Performance of a contract (providing the Service).</li>
            <li>Legal obligations (if required).</li>
            <li>Legitimate interests (security, fraud prevention, and service improvement).</li>
            <li>Consent (for certain cookies or analytics where applicable).</li>
          </ul>
        </Card>
      </Box>

      {/* Section 5 */}
      <Box className={classes.section}>
        <Typography variant="h2" className={classes.sectionTitle}>
          5. Sharing data with third parties
        </Typography>
        <Card className={classes.card}>
          <Typography className={classes.paragraph}>
            We may share data with infrastructure and hosting providers, OAuth providers (only what you consent to share), analytics services, and when required by law. If you add a YouTube link, the video content itself remains hosted by YouTube; we store only the link and metadata.
          </Typography>
        </Card>
      </Box>

      {/* Section 6 */}
      <Box className={classes.section}>
        <Typography variant="h2" className={classes.sectionTitle}>
          6. Cookies and tracking technologies
        </Typography>
        <Card className={classes.card}>
          <Typography className={classes.paragraph}>
            We use cookies and local storage for sessions, authentication, and UI preferences. Optional analytics may be used with consent. You can disable cookies in your browser, but some Service features may stop working properly.
          </Typography>
        </Card>
      </Box>

      {/* Section 7 */}
      <Box className={classes.section}>
        <Typography variant="h2" className={classes.sectionTitle}>
          7. Security
        </Typography>
        <Card className={classes.card}>
          <Typography className={classes.paragraph}>
            We implement industry-standard measures to protect personal data (TLS, access controls, backups). If a breach occurs we will notify affected users as required by law.
          </Typography>
        </Card>
      </Box>

      {/* Section 8 */}
      <Box className={classes.section}>
        <Typography variant="h2" className={classes.sectionTitle}>
          8. Data retention and deletion
        </Typography>
        <Card className={classes.card}>
          <Typography className={classes.paragraph}>
            Accounts and related personal data are retained until you request deletion or we must retain data for legal reasons. After a deletion request, the account is deactivated and deletion begins; backups and logs may persist for a limited time and will be purged in due course. We may retain anonymized data for analytics.
          </Typography>
        </Card>
      </Box>

      {/* Section 9 */}
      <Box className={classes.section}>
        <Typography variant="h2" className={classes.sectionTitle}>
          9. Your rights
        </Typography>
        <Card className={classes.card}>
          <Typography className={classes.paragraph}>
            You may have rights to access, correct, delete, restrict, or port your personal data. To exercise these rights, contact <a href="mailto:contact@qirim.online" className={classes.link}>contact@qirim.online</a>.
          </Typography>
        </Card>
      </Box>

      {/* Section 10 */}
      <Box className={classes.section}>
        <Typography variant="h2" className={classes.sectionTitle}>
          10. How to delete your account
        </Typography>
        <Card className={classes.card}>
          <Typography className={classes.paragraph}>
            You can delete your account in two ways: through the website or by email.
          </Typography>

          <Typography className={classes.paragraph} style={{ fontWeight: 600, marginTop: '16px' }}>
            Option A — Delete via the website
          </Typography>
          <ol className={classes.list}>
            <li>Log in to your account.</li>
            <li>Go to Settings → Account (or Profile).</li>
            <li>Click "Delete account" and confirm. Your account will be deactivated and deletion will begin.</li>
          </ol>

          <Typography className={classes.paragraph} style={{ fontWeight: 600, marginTop: '24px' }}>
            Option B — Email request
          </Typography>
          <Typography className={classes.paragraph}>
            If you cannot use the website, send an email to <a href="mailto:contact@qirim.online" className={classes.link}>contact@qirim.online</a> with the subject:
          </Typography>

          <Box className={classes.codeBlock}>
            Account deletion request — [your email/username]
          </Box>

          <Typography className={classes.paragraph}>
            Suggested message body:
          </Typography>

          <Box className={classes.codeBlock}>
{`Hello,

Please delete my Qırım Online account and all associated personal data.

Account details:
- Username: <your_username>
- Email: <your_email_address>
- Any other info to help identify the account (optional): <e.g., date of registration>

Please confirm receipt of this request and let me know when the deletion is completed.

Thank you,
<Your name>`}
          </Box>

          <Typography className={classes.paragraph}>
            After the request we may ask you to confirm account ownership. Full deletion typically occurs within 30 days.
          </Typography>
        </Card>
      </Box>

      {/* Section 11 */}
      <Box className={classes.section}>
        <Typography variant="h2" className={classes.sectionTitle}>
          11. Deleting content you uploaded
        </Typography>
        <Card className={classes.card}>
          <Typography className={classes.paragraph}>
            Content you uploaded will be deleted or anonymized unless legal retention obligations apply. Content shared externally cannot be removed by us.
          </Typography>
        </Card>
      </Box>

      {/* Section 12 */}
      <Box className={classes.section}>
        <Typography variant="h2" className={classes.sectionTitle}>
          12. Changes to this policy
        </Typography>
        <Card className={classes.card}>
          <Typography className={classes.paragraph}>
            We may update this policy. Material changes will be posted on the site and the effective date updated.
          </Typography>
        </Card>
      </Box>

      {/* Section 13 */}
      <Box className={classes.section}>
        <Typography variant="h2" className={classes.sectionTitle}>
          13. Contact
        </Typography>
        <Card className={classes.card}>
          <Typography className={classes.paragraph}>
            For privacy inquiries or deletion requests: <a href="mailto:contact@qirim.online" className={classes.link}>contact@qirim.online</a>
          </Typography>
        </Card>
      </Box>
    </Box>
  )
}

export default Privacy
