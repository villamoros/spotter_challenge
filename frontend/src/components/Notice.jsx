/**
 * @file Inline notice for warnings and errors.
 *
 * English: Errors use role="alert" so screen readers announce them at once.
 *
 * Español: Los errores usan role="alert" para que los lectores de pantalla los anuncien enseguida.
 */

import { useI18n } from '../i18n/I18nProvider.jsx';
import { Icon } from '../icons.jsx';

/**
 * Render a dismissible message.
 *
 * English: The tone decides the icon and the ARIA role.
 *
 * Español: El tono decide el ícono y el rol ARIA.
 *
 * @param {Object} props
 * @param {'info'|'error'} [props.tone='info'] - Visual and semantic tone.
 * @param {React.ReactNode} props.children - Message content.
 * @param {Function} [props.onClose] - When given, a close button is shown.
 */
export default function Notice({ tone = 'info', children, onClose }) {
  const { t } = useI18n();
  const Glyph = tone === 'error' ? Icon.Alert : Icon.Info;
  return (
    <div className={`notice notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Glyph size={17} />
      <div className="notice__body">{children}</div>
      {onClose && (
        <button type="button" className="btn btn--icon btn--flat" aria-label={t('notice.dismiss')} onClick={onClose}>
          <Icon.X size={15} />
        </button>
      )}
    </div>
  );
}
