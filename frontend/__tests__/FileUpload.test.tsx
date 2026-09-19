import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FileUpload from '../src/components/FileUpload';

describe('FileUpload Component', () => {
  it('renders upload zone with proper ARIA accessibility attributes', () => {
    const handleFileSelect = jest.fn();
    render(
      <FileUpload
        id="test-upload"
        label="Test Contract Upload"
        onFileSelect={handleFileSelect}
      />
    );

    expect(screen.getByText('Test Contract Upload')).toBeInTheDocument();

    const dropZone = screen.getByRole('button', {
      name: /Test Contract Upload\. Drag and drop or press Enter to browse/i,
    });
    expect(dropZone).toBeInTheDocument();
    expect(dropZone).toHaveAttribute('tabIndex', '0');
  });

  it('accepts valid legal file types (.pdf) and fires callback', () => {
    const handleFileSelect = jest.fn();
    render(
      <FileUpload
        id="test-upload"
        label="Test Contract Upload"
        onFileSelect={handleFileSelect}
      />
    );

    const input = screen.getByTestId('test-upload-input');
    const validFile = new File(['Contract Clause text'], 'agreement.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(input, { target: { files: [validFile] } });

    expect(handleFileSelect).toHaveBeenCalledTimes(1);
    expect(handleFileSelect).toHaveBeenCalledWith(validFile);
    expect(screen.getByText(/✓ agreement\.pdf/i)).toBeInTheDocument();
  });

  it('rejects invalid file types and displays an accessible error message', () => {
    const handleFileSelect = jest.fn();
    render(
      <FileUpload
        id="test-upload"
        label="Test Contract Upload"
        onFileSelect={handleFileSelect}
      />
    );

    const input = screen.getByTestId('test-upload-input');
    const invalidFile = new File(['malicious'], 'script.exe', {
      type: 'application/x-msdownload',
    });

    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(handleFileSelect).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Invalid file type "\.exe"\. Accepted: PDF, Text, Word\./i)
    ).toBeInTheDocument();
  });
});
