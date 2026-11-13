.page {
  width: 100%;
  max-width: 21.15em;
  margin-inline: auto;
  text-align: center;
}

.title {
  margin: 0;
  font-size: 1.55em;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.025em;
}
.subtitle {
  margin: 0.8em 0 0;
  color: var(--auth-muted);
  font-size: 1em;
  line-height: 1.4;
}

.cta {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6em;
  height: 2.97em;
  margin-top: 1.5em;
  overflow: hidden;
  border-radius: 0.3em;
  background: var(--auth-brand);
  color: #fff;
  font-weight: 600;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.2s, transform 0.15s, box-shadow 0.25s;
}
.cta svg {
  width: 1.15em;
  height: 1.15em;
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}
.cta::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.35) 50%, transparent 70%);
  transform: translateX(-120%);
  pointer-events: none;
}
.cta:hover {
  background: var(--auth-brand-hover);
  box-shadow: 0 0.7em 1.5em -0.6em rgba(242, 15, 27, 0.75);
  transform: translateY(-1px);
}
.cta:hover svg {
  transform: translateX(0.3em);
}
.cta:hover::after {
  transform: translateX(120%);
  transition: transform 0.8s ease;
}
.cta:active {
  transform: translateY(0) scale(0.985);
}
.cta:focus-visible {
  outline: 2px solid var(--auth-brand);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .cta,
  .cta svg {
    transition: none;
  }
  .cta::after {
    display: none;
  }
}