export const ROLES = ['Admin', 'Sub-admin', 'Human Resource', 'Member']

export const PERMISSION_GROUPS = [
  {
    label: 'Dashboard',
    items: [
      { key: 'Dashboard-View', label: 'View' },
      { key: 'Dashboard-Analytics', label: 'Analytics' },
      { key: 'Dashboard-Reports Export', label: 'Reports Export' },
    ],
  },
  {
    label: 'Templates',
    items: [
      { key: 'Templates-View', label: 'View' },
      { key: 'Templates-Create', label: 'Create' },
      { key: 'Templates-Delete', label: 'Delete' },
    ],
  },
  {
    label: 'Documents',
    items: [
      { key: 'Documents-View', label: 'View' },
      { key: 'Documents-Upload', label: 'Upload' },
      { key: 'Documents-Edit', label: 'Edit' },
      { key: 'Documents-Delete', label: 'Delete' },
      { key: 'Documents-Send for Signature', label: 'Send for Signature' },
      { key: 'Documents-Cancel Requests', label: 'Cancel Requests' },
      { key: 'Documents-Archive', label: 'Archive' },
    ],
  },
  {
    label: 'Contact Books',
    items: [
      { key: 'Contact Books-View', label: 'View' },
      { key: 'Contact Books-Add', label: 'Add' },
      { key: 'Contact Books-Edit', label: 'Edit' },
      { key: 'Contact Books-Delete', label: 'Delete' },
    ],
  },
]