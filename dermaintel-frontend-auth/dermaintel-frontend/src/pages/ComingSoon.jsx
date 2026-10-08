import Container from '../components/layout/Container';
import PageSection from '../components/layout/PageSection';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import './ComingSoon.css';

/**
 * ComingSoon
 * Stands in for every feature page (Dashboard, Scan & Analyze, Results,
 * Monitoring, History, Pipeline) while only the app shell exists. Each
 * route passes its own eyebrow/title/description so the shell already
 * demonstrates real navigation between distinct pages.
 */
export default function ComingSoon({ eyebrow, title, description }) {
  return (
    <Container>
      <PageSection eyebrow={eyebrow} title={title} description={description} />
      <div className="coming-soon">
        <Card padding="lg" className="coming-soon__card">
          <Badge tone="accent" dot>
            Stage 1 · App shell
          </Badge>
          <h3 className="coming-soon__heading">This page is not built yet</h3>
          <p className="coming-soon__body">
            The navigation, layout and design system are in place. This route is reserved for the{' '}
            <strong>{title}</strong> feature, which will be implemented in a later stage.
          </p>
        </Card>
      </div>
    </Container>
  );
}
