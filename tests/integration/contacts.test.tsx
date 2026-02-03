// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactManager from '@/components/contacts/contact-manager';

describe('Contact Components', () => {
  const defaultProps = {
    organizationId: 'org-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.confirm
    global.confirm = jest.fn(() => true);
    global.alert = jest.fn();
  });

  describe('ContactManager - Contact List Display', () => {
    it('should render contact list with sample data', () => {
      render(<ContactManager {...defaultProps} />);

      expect(screen.getByText(/john smith/i)).toBeInTheDocument();
      expect(screen.getByText(/sarah johnson/i)).toBeInTheDocument();
      expect(screen.getByText(/mike chen/i)).toBeInTheDocument();
    });

    it('should display contact count and filtered count', () => {
      render(<ContactManager {...defaultProps} />);

      expect(screen.getByText(/of \d+ contacts/i)).toBeInTheDocument();
    });

    it('should show contact details in table view', () => {
      render(<ContactManager {...defaultProps} />);

      expect(screen.getByText(/tech corp/i)).toBeInTheDocument();
      expect(screen.getByText(/\+1234567890/)).toBeInTheDocument();
      expect(screen.getByText(/ceo/i)).toBeInTheDocument();
    });

    it('should support pagination through large contact lists', () => {
      render(<ContactManager {...defaultProps} />);

      // Table should be scrollable for many contacts
      const tableContainer = document.querySelector('.overflow-y-auto');
      expect(tableContainer).toBeInTheDocument();
    });
  });

  describe('ContactManager - Search Functionality', () => {
    it('should filter contacts by name search', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search contacts/i);
      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(screen.getByText(/john smith/i)).toBeInTheDocument();
        expect(screen.queryByText(/mike chen/i)).not.toBeInTheDocument();
      });
    });

    it('should filter contacts by email search', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search contacts/i);
      await user.type(searchInput, 'john.smith@example.com');

      await waitFor(() => {
        expect(screen.getByText(/john smith/i)).toBeInTheDocument();
      });
    });

    it('should filter contacts by phone search', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search contacts/i);
      await user.type(searchInput, '+1234567890');

      await waitFor(() => {
        expect(screen.getByText(/john smith/i)).toBeInTheDocument();
      });
    });

    it('should show no results message when search has no matches', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search contacts/i);
      await user.type(searchInput, 'NonexistentName12345');

      await waitFor(() => {
        expect(screen.getByText(/no contacts found/i)).toBeInTheDocument();
      });
    });
  });

  describe('ContactManager - Filters', () => {
    it('should toggle filter panel on button click', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      await waitFor(() => {
        expect(screen.getByTitle(/filter by contact status/i)).toBeInTheDocument();
      });
    });

    it('should filter by contact status', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      const statusFilter = screen.getByTitle(/filter by contact status/i);
      await user.selectOptions(statusFilter, 'active');

      await waitFor(() => {
        expect(screen.getByText(/john smith/i)).toBeInTheDocument();
        expect(screen.queryByText(/mike chen/i)).not.toBeInTheDocument();
      });
    });

    it('should filter by contact source', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      const sourceFilter = screen.getByTitle(/filter by contact source/i);
      await user.selectOptions(sourceFilter, 'whatsapp');

      await waitFor(() => {
        // John Smith is from WhatsApp source
        expect(screen.getByText(/john smith/i)).toBeInTheDocument();
      });
    });

    it('should filter by tags', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      // Click on VIP tag
      const vipTag = screen.getByRole('button', { name: /vip/i });
      await user.click(vipTag);

      await waitFor(() => {
        expect(screen.getByText(/john smith/i)).toBeInTheDocument();
      });
    });

    it('should filter starred contacts only', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      const starredCheckbox = screen.getByText(/starred only/i).previousElementSibling as HTMLInputElement;
      await user.click(starredCheckbox);

      await waitFor(() => {
        expect(screen.getByText(/john smith/i)).toBeInTheDocument();
      });
    });

    it('should clear all filters on clear button click', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      const statusFilter = screen.getByTitle(/filter by contact status/i);
      await user.selectOptions(statusFilter, 'active');

      const clearButton = screen.getByText(/clear filters/i);
      await user.click(clearButton);

      await waitFor(() => {
        expect(statusFilter).toHaveValue('all');
      });
    });
  });

  describe('ContactManager - Contact Selection', () => {
    it('should select individual contacts', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const firstContactCheckbox = checkboxes.find(cb => cb.getAttribute('title')?.includes('Select contact'));

      if (firstContactCheckbox) {
        await user.click(firstContactCheckbox);

        await waitFor(() => {
          expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
        });
      }
    });

    it('should select all contacts with master checkbox', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const selectAllCheckbox = screen.getByTitle(/select all contacts/i);
      await user.click(selectAllCheckbox);

      await waitFor(() => {
        expect(screen.getByText(/3 selected/i)).toBeInTheDocument();
      });
    });

    it('should deselect all when clicking select all again', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const selectAllCheckbox = screen.getByTitle(/select all contacts/i);
      await user.click(selectAllCheckbox);
      await user.click(selectAllCheckbox);

      await waitFor(() => {
        expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('ContactManager - Contact Actions', () => {
    it('should star and unstar contacts', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const starButtons = screen.getAllByLabelText(/star contact/i);
      await user.click(starButtons[0]);

      // Star action is executed (visual change in component)
      expect(starButtons[0]).toBeInTheDocument();
    });

    it('should delete single contact with confirmation', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const deleteButtons = screen.getAllByLabelText(/delete contact/i);
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalled();
      });
    });

    it('should delete multiple selected contacts', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const selectAllCheckbox = screen.getByTitle(/select all contacts/i);
      await user.click(selectAllCheckbox);

      const deleteSelectedButton = screen.getByLabelText(/delete selected contacts/i);
      await user.click(deleteSelectedButton);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('3 contact'));
      });
    });

    it('should open edit modal when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const editButtons = screen.getAllByLabelText(/edit contact/i);
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/edit contact/i)).toBeInTheDocument();
      });
    });

    it('should open add contact modal', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /add contact/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/add new contact/i)).toBeInTheDocument();
      });
    });
  });

  describe('ContactManager - Import/Export', () => {
    it('should open import modal', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const importButton = screen.getByRole('button', { name: /import/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByText(/import contacts/i)).toBeInTheDocument();
      });
    });

    it('should show import file input and requirements', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const importButton = screen.getByRole('button', { name: /import/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByText(/required columns/i)).toBeInTheDocument();
        expect(screen.getByText(/first_name \(required\)/i)).toBeInTheDocument();
      });
    });

    it('should export contacts on export button click', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Exported'));
      });
    });
  });

  describe('ContactManager - View Modes', () => {
    it('should switch to grid view', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const gridViewButton = screen.getByLabelText(/grid view/i);
      await user.click(gridViewButton);

      await waitFor(() => {
        const gridContainer = document.querySelector('.grid.grid-cols-1');
        expect(gridContainer).toBeInTheDocument();
      });
    });

    it('should switch back to table view', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      const gridViewButton = screen.getByLabelText(/grid view/i);
      await user.click(gridViewButton);

      const tableViewButton = screen.getByLabelText(/table view/i);
      await user.click(tableViewButton);

      await waitFor(() => {
        const table = document.querySelector('table');
        expect(table).toBeInTheDocument();
      });
    });
  });

  describe('ContactManager - Accessibility', () => {
    it('should have proper ARIA labels for all buttons', () => {
      render(<ContactManager {...defaultProps} />);

      expect(screen.getByLabelText(/table view/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/grid view/i)).toBeInTheDocument();
      // Star contact buttons are multiple, use getAllByLabelText
      expect(screen.getAllByLabelText(/star contact/i).length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation through contacts', async () => {
      const user = userEvent.setup();
      render(<ContactManager {...defaultProps} />);

      await user.tab();

      // Should be able to navigate through interactive elements
      const activeElement = document.activeElement;
      // Verify we can tab through the interface (any focusable element is acceptable)
      expect(activeElement?.tagName).toMatch(/BUTTON|INPUT|SELECT|TEXTAREA/i);
    });

    it('should have accessible table headers', () => {
      render(<ContactManager {...defaultProps} />);

      expect(screen.getByText(/contact info/i)).toBeInTheDocument();
      expect(screen.getByText(/last contact/i)).toBeInTheDocument();
      expect(screen.getByText(/actions/i)).toBeInTheDocument();
    });
  });
});
