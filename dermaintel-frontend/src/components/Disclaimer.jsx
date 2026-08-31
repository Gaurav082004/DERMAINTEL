export default function Disclaimer({ children }) {
  return (
    <div className="disclaimer">
      {children || 'This is a research prototype and is not a substitute for professional medical diagnosis.'}
    </div>
  );
}
