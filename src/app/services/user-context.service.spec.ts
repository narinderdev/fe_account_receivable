import { UserContextService } from './user-context.service';

describe('UserContextService', () => {
  let service: UserContextService;

  beforeEach(() => {
    localStorage.clear();
    service = new UserContextService();
  });

  it('uses the selected company permissions from login payload', () => {
    localStorage.setItem('selectedCompanyId', '222');

    service.setFromLogin({
      id: 5,
      userCompanies: [
        {
          company: { id: 111 },
          roles: [
            {
              role: {
                name: 'Viewer',
                permissions: ['VIEW_DASHBOARD'],
              },
            },
          ],
        },
        {
          company: { id: 222 },
          roles: [
            {
              role: {
                name: 'Admin',
                permissions: ['VIEW_USER', 'VIEW_ROLES'],
              },
            },
          ],
        },
      ],
    });

    expect(service.hasPermission('VIEW_USER')).toBe(true);
    expect(service.hasPermission('VIEW_DASHBOARD')).toBe(false);
    expect(service.isAdmin()).toBe(true);
  });

  it('defaults selected company to the first linked company when missing', () => {
    service.setFromLogin({
      id: 9,
      userCompanies: [
        {
          company: { id: 333 },
          roles: [
            {
              role: {
                name: 'Collector',
                permissions: ['VIEW_PAYMENTS'],
              },
            },
          ],
        },
      ],
    });

    expect(localStorage.getItem('selectedCompanyId')).toBe('333');
    expect(service.hasPermission('VIEW_PAYMENTS')).toBe(true);
  });
});
