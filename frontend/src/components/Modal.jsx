import React from "react";
import { Modal as AntdModal } from "antd";
import "./Modal.css";

/**
 * Shared Modal used by every feature in the app. Internally this wraps
 * antd's own <Modal> (for its animations, focus handling, and correct
 * z-index stacking with other antd overlays like Select dropdowns), but
 * every page keeps using the same simple prop names as before — nothing
 * else in the app needs to change if this implementation changes again.
 *
 * Default look is flat and minimal — white throughout, no colored header
 * bar, generous rounded corners, indigo used only for focus rings,
 * buttons, checkboxes, and links (matching the reference sign-in/sign-up
 * card design: a small icon avatar next to the title, a muted subtitle
 * underneath, bordered form fields, and a solid indigo primary button).
 *
 * Usage — simple (most modals):
 *   <Modal
 *     isOpen={isOpen}
 *     title="Delete user"
 *     onClose={() => setIsOpen(false)}
 *     footer={
 *       <>
 *         <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
 *         <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
 *       </>
 *     }
 *   >
 *     <p>Are you sure you want to delete this user? This can't be undone.</p>
 *   </Modal>
 *
 * Usage — with the icon avatar + subtitle (matching the reference design
 * most closely, for a page's primary "hero" modal like sign-in/sign-up,
 * or a welcome/create flow):
 *   <Modal
 *     isOpen={isOpen}
 *     icon={<UserOutlined />}
 *     title="Sign in to user account"
 *     subtitle="Welcome back! We missed you"
 *     onClose={...}
 *   >
 *     ...
 *   </Modal>
 *
 * Leave footer unset for a modal with no footer at all (this component
 * does NOT fall back to antd's default OK/Cancel buttons, unlike using
 * antd's <Modal> directly) — the reference design puts its primary
 * button inline in the body/form instead of a separate footer bar, which
 * works fine here too: just render the button as part of children.
 *
 * Pass size="lg" for wide content (multi-column forms, profile views) that
 * would feel cramped in the 480px default. Pass size="xl" for genuinely
 * dense content (multiple stat cards in a row, side-by-side panels, a
 * wide table) that needs more than 880px.
 *
 * Pass headerVariant="dark" for an alternate dark-gradient header with a
 * tinted body — bolder look for profile-style modals that want more
 * visual weight than the standard flat header.
 *
 * Pass keepMounted for a modal with heavy content (a big form, several
 * nested sections) that already resets its own state/fetches fresh data
 * every time it opens — skips antd's destroyOnClose, so reopening it
 * doesn't rebuild the whole React tree from scratch every time, which
 * otherwise makes heavier modals feel slow to open.
 *
 * Pass zIndex only when a modal must open on top of another full-screen
 * overlay that sits above antd's default stack (e.g. the legal reply
 * editor at z-index 2000). Omit it everywhere else.
 */
export default function Modal({ isOpen, title, subtitle, icon, onClose, children, footer, size = "md", headerVariant, keepMounted, zIndex }) {
  const isDark = headerVariant === "dark";

  const titleContent =
    icon || subtitle ? (
      <div className="modal-title-row">
        {icon && <div className="modal-icon-avatar">{icon}</div>}
        <div className="modal-title-col">
          <div className="modal-title-text">{title}</div>
          {subtitle && <div className="modal-subtitle-text">{subtitle}</div>}
        </div>
      </div>
    ) : (
      title
    );

  return (
    <AntdModal
      open={isOpen}
      title={titleContent}
      onCancel={onClose}
      footer={footer !== undefined ? footer : null}
      width={size === "xl" ? 1100 : size === "lg" ? 880 : 480}
      className={isDark ? "modal-dark-header" : undefined}
      destroyOnClose={!keepMounted}
      maskClosable
      centered
      {...(zIndex ? { zIndex } : {})}
    >
      {children}
    </AntdModal>
  );
}