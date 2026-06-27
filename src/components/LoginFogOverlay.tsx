/**
 * Full-page volumetric fog — layered blurred gradients with independent drift paths.
 * pointer-events-none; sits above hero, below form content.
 */
export default function LoginFogOverlay() {
  return (
    <div
      className="login-fog pointer-events-none absolute inset-0 z-10 overflow-hidden"
      aria-hidden
    >
      <div className="login-fog__base" />
      <div className="login-fog__patch login-fog__patch--1" />
      <div className="login-fog__patch login-fog__patch--2" />
      <div className="login-fog__patch login-fog__patch--3" />
      <div className="login-fog__patch login-fog__patch--4" />
      <div className="login-fog__patch login-fog__patch--5" />
      <div className="login-fog__patch login-fog__patch--6" />
      <div className="login-fog__wisp login-fog__wisp--1" />
      <div className="login-fog__wisp login-fog__wisp--2" />
      <div className="login-fog__wisp login-fog__wisp--3" />
    </div>
  );
}
