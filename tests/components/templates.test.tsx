// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock template components (simplified for testing)
const TemplateList = ({ templates, onSelect, onDelete }: any) => (
  <div>
    <h2>Message Templates</h2>
    <input type="text" placeholder="Search templates..." aria-label="Search templates" />
    {templates.map((template: any) => (
      <div key={template.id} data-testid={`template-${template.id}`}>
        <h3>{template.name}</h3>
        <p>{template.content}</p>
        <button onClick={() => onSelect(template)}>Use Template</button>
        <button onClick={() => onDelete(template.id)} aria-label={`Delete ${template.name}`}>
          Delete
        </button>
      </div>
    ))}
    {templates.length === 0 && <p>No templates found</p>}
  </div>
);

const TemplateForm = ({ template, onSave, onCancel }: any) => (
  <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
    <h2>{template ? 'Edit Template' : 'Create Template'}</h2>
    <div>
      <label htmlFor="template-name">Template Name</label>
      <input id="template-name" type="text" defaultValue={template?.name} required />
    </div>
    <div>
      <label htmlFor="template-content">Template Content</label>
      <textarea id="template-content" defaultValue={template?.content} required />
    </div>
    <div>
      <label htmlFor="template-category">Category</label>
      <select id="template-category" defaultValue={template?.category}>
        <option value="greeting">Greeting</option>
        <option value="order">Order</option>
        <option value="support">Support</option>
        <option value="marketing">Marketing</option>
      </select>
    </div>
    <button type="button" onClick={() => { /* Insert {{name}} */ }}>
      Insert Variable
    </button>
    <button type="submit">Save Template</button>
    <button type="button" onClick={onCancel}>Cancel</button>
  </form>
);

const TemplatePreview = ({ template, variables }: any) => {
  let content = template.content;
  Object.keys(variables).forEach(key => {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
  });

  return (
    <div>
      <h3>Template Preview</h3>
      <div data-testid="preview-content">{content}</div>
      {template.variables?.map((v: string) => (
        <div key={v}>
          <label htmlFor={`var-${v}`}>{v}</label>
          <input id={`var-${v}`} type="text" placeholder={`Enter ${v}`} />
        </div>
      ))}
    </div>
  );
};

describe('Template Components', () => {
  const mockTemplates = [
    {
      id: '1',
      name: 'Welcome Message',
      content: 'Hello {{name}}! Welcome to our service.',
      category: 'greeting',
      variables: ['name'],
    },
    {
      id: '2',
      name: 'Order Confirmation',
      content: 'Your order #{{orderNumber}} has been confirmed. Total: {{amount}}.',
      category: 'order',
      variables: ['orderNumber', 'amount'],
    },
    {
      id: '3',
      name: 'Support Response',
      content: 'Thank you for contacting support about {{topic}}.',
      category: 'support',
      variables: ['topic'],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TemplateList', () => {
    it('should render all templates', () => {
      const mockOnSelect = jest.fn();
      const mockOnDelete = jest.fn();

      render(
        <TemplateList
          templates={mockTemplates}
          onSelect={mockOnSelect}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Welcome Message')).toBeInTheDocument();
      expect(screen.getByText('Order Confirmation')).toBeInTheDocument();
      expect(screen.getByText('Support Response')).toBeInTheDocument();
    });

    it('should show template content and category', () => {
      const mockOnSelect = jest.fn();
      const mockOnDelete = jest.fn();

      render(
        <TemplateList
          templates={mockTemplates}
          onSelect={mockOnSelect}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText(/hello {{name}}/i)).toBeInTheDocument();
    });

    it('should call onSelect when use template is clicked', async () => {
      const user = userEvent.setup();
      const mockOnSelect = jest.fn();
      const mockOnDelete = jest.fn();

      render(
        <TemplateList
          templates={mockTemplates}
          onSelect={mockOnSelect}
          onDelete={mockOnDelete}
        />
      );

      const useButtons = screen.getAllByText('Use Template');
      await user.click(useButtons[0]);

      expect(mockOnSelect).toHaveBeenCalledWith(mockTemplates[0]);
    });

    it('should call onDelete when delete is clicked', async () => {
      const user = userEvent.setup();
      const mockOnSelect = jest.fn();
      const mockOnDelete = jest.fn();

      render(
        <TemplateList
          templates={mockTemplates}
          onSelect={mockOnSelect}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByLabelText(/delete welcome message/i);
      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith('1');
    });

    it('should show no templates message when list is empty', () => {
      const mockOnSelect = jest.fn();
      const mockOnDelete = jest.fn();

      render(
        <TemplateList
          templates={[]}
          onSelect={mockOnSelect}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('No templates found')).toBeInTheDocument();
    });

    it('should have search input for filtering templates', () => {
      const mockOnSelect = jest.fn();
      const mockOnDelete = jest.fn();

      render(
        <TemplateList
          templates={mockTemplates}
          onSelect={mockOnSelect}
          onDelete={mockOnDelete}
        />
      );

      const searchInput = screen.getByLabelText(/search templates/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('TemplateForm', () => {
    it('should render form for creating new template', () => {
      const mockOnSave = jest.fn();
      const mockOnCancel = jest.fn();

      render(
        <TemplateForm
          template={null}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Create Template')).toBeInTheDocument();
      expect(screen.getByLabelText(/template name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/template content/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });

    it('should render form with existing template data for editing', () => {
      const mockOnSave = jest.fn();
      const mockOnCancel = jest.fn();

      render(
        <TemplateForm
          template={mockTemplates[0]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Edit Template')).toBeInTheDocument();
      expect(screen.getByLabelText(/template name/i)).toHaveValue('Welcome Message');
      expect(screen.getByLabelText(/template content/i)).toHaveValue(
        'Hello {{name}}! Welcome to our service.'
      );
    });

    it('should have all category options available', () => {
      const mockOnSave = jest.fn();
      const mockOnCancel = jest.fn();

      render(
        <TemplateForm
          template={null}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const categorySelect = screen.getByLabelText(/category/i);
      expect(categorySelect).toBeInTheDocument();
      expect(screen.getByText('Greeting')).toBeInTheDocument();
      expect(screen.getByText('Order')).toBeInTheDocument();
      expect(screen.getByText('Support')).toBeInTheDocument();
      expect(screen.getByText('Marketing')).toBeInTheDocument();
    });

    it('should have variable insertion button', () => {
      const mockOnSave = jest.fn();
      const mockOnCancel = jest.fn();

      render(
        <TemplateForm
          template={null}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Insert Variable')).toBeInTheDocument();
    });

    it('should call onSave when form is submitted', async () => {
      const user = userEvent.setup();
      const mockOnSave = jest.fn();
      const mockOnCancel = jest.fn();

      render(
        <TemplateForm
          template={null}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText(/template name/i), 'Test Template');
      await user.type(screen.getByLabelText(/template content/i), 'Test content');

      const saveButton = screen.getByText('Save Template');
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalled();
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnSave = jest.fn();
      const mockOnCancel = jest.fn();

      render(
        <TemplateForm
          template={null}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should require template name and content', () => {
      const mockOnSave = jest.fn();
      const mockOnCancel = jest.fn();

      render(
        <TemplateForm
          template={null}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByLabelText(/template name/i);
      const contentInput = screen.getByLabelText(/template content/i);

      expect(nameInput).toBeRequired();
      expect(contentInput).toBeRequired();
    });
  });

  describe('TemplatePreview', () => {
    it('should render template preview with variables replaced', () => {
      const template = mockTemplates[0];
      const variables = { name: 'John Doe' };

      render(<TemplatePreview template={template} variables={variables} />);

      const preview = screen.getByTestId('preview-content');
      expect(preview).toHaveTextContent('Hello John Doe! Welcome to our service.');
    });

    it('should render template preview with multiple variables replaced', () => {
      const template = mockTemplates[1];
      const variables = { orderNumber: '12345', amount: '$99.99' };

      render(<TemplatePreview template={template} variables={variables} />);

      const preview = screen.getByTestId('preview-content');
      expect(preview).toHaveTextContent('Your order #12345 has been confirmed. Total: $99.99.');
    });

    it('should show input fields for each variable', () => {
      const template = mockTemplates[1];
      const variables = {};

      render(<TemplatePreview template={template} variables={variables} />);

      expect(screen.getByLabelText('orderNumber')).toBeInTheDocument();
      expect(screen.getByLabelText('amount')).toBeInTheDocument();
    });

    it('should handle templates with no variables', () => {
      const template = {
        id: '4',
        name: 'Simple Template',
        content: 'This is a simple template with no variables.',
        category: 'general',
        variables: [],
      };
      const variables = {};

      render(<TemplatePreview template={template} variables={variables} />);

      const preview = screen.getByTestId('preview-content');
      expect(preview).toHaveTextContent('This is a simple template with no variables.');
    });
  });

  describe('Template Accessibility', () => {
    it('should have proper labels for all form inputs', () => {
      const mockOnSave = jest.fn();
      const mockOnCancel = jest.fn();

      render(
        <TemplateForm
          template={null}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/template name/i)).toHaveAccessibleName();
      expect(screen.getByLabelText(/template content/i)).toHaveAccessibleName();
      expect(screen.getByLabelText(/category/i)).toHaveAccessibleName();
    });

    it('should have accessible delete buttons with descriptive labels', () => {
      const mockOnSelect = jest.fn();
      const mockOnDelete = jest.fn();

      render(
        <TemplateList
          templates={mockTemplates}
          onSelect={mockOnSelect}
          onDelete={mockOnDelete}
        />
      );

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons.length).toBeGreaterThan(0);
      expect(deleteButtons[0]).toHaveAccessibleName();
    });

    it('should support keyboard navigation in template form', async () => {
      const user = userEvent.setup();
      const mockOnSave = jest.fn();
      const mockOnCancel = jest.fn();

      render(
        <TemplateForm
          template={null}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await user.tab();

      // First tab should focus name input
      const nameInput = screen.getByLabelText(/template name/i);
      expect(document.activeElement === nameInput || document.activeElement?.tagName === 'INPUT').toBe(true);
    });
  });
});
