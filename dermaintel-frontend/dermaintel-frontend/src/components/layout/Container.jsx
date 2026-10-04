import './Container.css';

/**
 * Container
 * Centers content and applies the app's max-width and responsive gutters.
 */
export default function Container({ className = '', children, ...rest }) {
  return (
    <div className={['container', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}
