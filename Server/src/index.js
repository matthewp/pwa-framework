import { Fragment, h, createContext } from 'preact';

export const Settings = createContext({});

export const MountPoint = ({children}) => <div id="app">{children}</div>;

export function Html({ lang, children }) {
  return (
    <Settings.Consumer>
      {settings => {
        return (
          <Fragment>
            <html lang={lang || 'en'}>
              !!HEAD_CONTENT!!
              <script type="module" src={settings.start}></script>
              {children}
              !!DATA_CONTENT!!
            </html>
          </Fragment>
        )
      }}
    </Settings.Consumer>
  );
}