import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';

// Wrapper with Fluent UI Provider
function AllTheProviders({ children }: { children: React.ReactNode }) {
  return (
    <FluentProvider theme={webLightTheme}>
      {children}
    </FluentProvider>
  );
}

// Custom render function that wraps components with providers
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';

// Override render with custom render
export { customRender as render };
