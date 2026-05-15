# PHASE 7 — FE_PROMPT.md
## Notifications: In-App Notification Bell, Feed, Unread Count, Read State

---

## CONTEXT

Phase 7 implements the frontend notification system: the notification bell in the toolbar, the notification feed dropdown/modal, unread count badge, and mark-as-read behavior. This applies to all roles (Admin, Staff, Doctor, Patient).

---

## REFERENCE DOCUMENTS
- `PROJECT.md` — Notifications section, trigger table, in-app delivery
- `FE_TECH_STACK.md` — Angular 17 standalone, NgRx SignalStore, Signals

---

## COMPONENTS TO BUILD

```
shared/
└── components/
    ├── notification-bell/
    │   ├── notification-bell.component.ts
    │   ├── notification-bell.component.html
    │   └── notification-bell.component.scss
    └── notification-feed/
        ├── notification-feed.component.ts
        ├── notification-feed.component.html
        └── notification-feed.component.scss

core/
└── stores/
    └── notification.store.ts
```

---

## SERVICES (Angular)

```typescript
// core/services/notification.service.ts
getNotifications(page: number, pageSize: number): Observable<PaginatedNotifications>
getUnreadCount(): Observable<{ count: number }>
markAsRead(id: string): Observable<void>
markAllAsRead(): Observable<void>
registerDeviceToken(token: string): Observable<void>
```

---

## MODELS

```typescript
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface PaginatedNotifications {
  items: AppNotification[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

---

## NOTIFICATION STORE (NgRx SignalStore)

```typescript
// core/stores/notification.store.ts
export const NotificationStore = signalStore(
  { providedIn: 'root' },
  withState({
    notifications: [] as AppNotification[],
    unreadCount: 0,
    isLoading: false,
    hasMore: true,
    currentPage: 1,
  }),
  withMethods((store, notifService = inject(NotificationService)) => ({
    loadUnreadCount: rxMethod<void>(...),    // calls getUnreadCount(), patches unreadCount
    loadNotifications: rxMethod<void>(...),  // loads page 1, replaces list
    loadMore: rxMethod<void>(...),           // loads next page, appends to list
    markAsRead(id: string): void,            // optimistic update + API call
    markAllAsRead(): void,                   // optimistic update + API call
  }))
);
```

### Polling Strategy

- Load unread count on app init (in `app.component.ts`)
- Poll unread count every 60 seconds using `setInterval` while user is authenticated
- Clear interval on logout

```typescript
// app.component.ts
ngOnInit() {
  const authStore = inject(AuthStore);
  const notifStore = inject(NotificationStore);

  effect(() => {
    if (authStore.isAuthenticated()) {
      notifStore.loadUnreadCount();
      this.pollingInterval = setInterval(() => {
        notifStore.loadUnreadCount();
      }, 60000);
    } else {
      clearInterval(this.pollingInterval);
    }
  });
}
```

---

## NOTIFICATION BELL COMPONENT

Used in the toolbar of ALL role dashboards (Admin, Staff, Doctor, Patient).

```html
<!-- notification-bell.component.html -->
<ion-button fill="clear" (click)="openFeed()">
  <ion-icon name="notifications-outline" slot="icon-only"></ion-icon>
  @if (notifStore.unreadCount() > 0) {
    <ion-badge color="danger" class="notification-badge">
      {{ notifStore.unreadCount() > 99 ? '99+' : notifStore.unreadCount() }}
    </ion-badge>
  }
</ion-button>
```

```scss
// notification-bell.component.scss
.notification-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  padding: 0 4px;
}
```

On click: opens Notification Feed as `ion-popover` (desktop) or `ion-modal` (mobile — detect via `platform.is('mobile')`).

---

## NOTIFICATION FEED COMPONENT

```html
<!-- notification-feed.component.html -->
<ion-header>
  <ion-toolbar>
    <ion-title>Notifications</ion-title>
    <ion-buttons slot="end">
      <ion-button fill="clear" size="small" (click)="markAllRead()">
        Mark all read
      </ion-button>
    </ion-buttons>
  </ion-toolbar>
</ion-header>

<ion-content>
  @if (notifStore.isLoading() && notifStore.notifications().length === 0) {
    <app-loading-spinner />
  }

  @for (notification of notifStore.notifications(); track notification.id) {
    <ion-item
      [class.unread]="!notification.isRead"
      (click)="markRead(notification.id)"
      lines="full">
      <ion-icon
        [name]="notification.isRead ? 'notifications-outline' : 'notifications'"
        [color]="notification.isRead ? 'medium' : 'primary'"
        slot="start">
      </ion-icon>
      <ion-label>
        <h3>{{ notification.title }}</h3>
        <p>{{ notification.message }}</p>
        <p class="timestamp">{{ notification.createdAt | phDate }}</p>
      </ion-label>
      @if (!notification.isRead) {
        <ion-badge color="primary" slot="end">New</ion-badge>
      }
    </ion-item>
  }

  @if (notifStore.hasMore()) {
    <ion-infinite-scroll (ionInfinite)="loadMore($event)">
      <ion-infinite-scroll-content loadingText="Loading more...">
      </ion-infinite-scroll-content>
    </ion-infinite-scroll>
  }

  @if (notifStore.notifications().length === 0 && !notifStore.isLoading()) {
    <div class="empty-state ion-text-center ion-padding">
      <ion-icon name="notifications-off-outline" size="large" color="medium"></ion-icon>
      <p>No notifications yet</p>
    </div>
  }
</ion-content>
```

```scss
// notification-feed.component.scss
ion-item.unread {
  --background: var(--ion-color-primary-tint);
  font-weight: 500;
}

.timestamp {
  font-size: 11px;
  color: var(--ion-color-medium);
}
```

---

## UNREAD DOT STYLING (Item Level)

Unread notifications have:
- Blue-tinted background (`--ion-color-primary-tint`)
- Bold title text
- "New" badge in primary color

Read notifications:
- Normal background
- Normal weight
- No badge

---

## INTEGRATE INTO ALL DASHBOARDS

Add `<app-notification-bell>` to the `ion-toolbar` of every role's main layout:

```html
<!-- admin shell toolbar -->
<ion-toolbar>
  <ion-buttons slot="start">
    <ion-menu-button></ion-menu-button>
  </ion-buttons>
  <ion-title>Admin</ion-title>
  <ion-buttons slot="end">
    <app-notification-bell></app-notification-bell>
    <ion-button (click)="logout()">Logout</ion-button>
  </ion-buttons>
</ion-toolbar>
```

Apply to: Admin shell, Staff shell, Doctor shell, Patient portal shell.

---

## MARK AS READ BEHAVIOR

- **Single tap on notification** → marks that notification as read (optimistic: update local store immediately, then call API)
- **Mark all read** button → marks all as read optimistically, then calls `PUT /api/v1/notifications/read-all`
- Unread count badge updates immediately after mark-as-read (no refetch needed — computed from store state)

---

## PATIENT PORTAL — NOTIFICATION PAGE (Optional Dedicated Page)

Route: `/portal/notifications`

For patients who want a full-page notification history (not just the bell dropdown):
- Same layout as the feed component
- Accessible from the portal's side menu or tab bar

---

## TASK

Build the notification bell, feed, and store. Integrate into all role dashboards. Build on Phases 1–6.

Result must:
1. Notification bell visible in toolbar for all roles (Admin, Staff, Doctor, Patient)
2. Unread count badge shown on bell when notifications exist
3. Badge shows "99+" when count > 99
4. Bell opens notification feed as popover on desktop, modal on mobile
5. Feed loads paginated notifications (20 per page)
6. Infinite scroll loads more notifications on scroll
7. Unread notifications have blue-tinted background and "New" badge
8. Tapping a notification marks it as read (optimistic update)
9. "Mark all read" button clears all unread state
10. Unread count polls every 60 seconds and updates the badge automatically
