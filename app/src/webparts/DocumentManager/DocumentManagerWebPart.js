import React from 'react';
import ReactDOM from 'react-dom';
import { sp } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import DocumentForm from '../../components/DocumentForm';

export default class DocumentManagerWebPart {
  constructor(context, domElement) {
    this.context = context;
    this.domElement = domElement;
    
    // Initialize PnP JS
    sp.setup({
      spfxContext: this.context
    });
  }

  render() {
    const element = React.createElement(DocumentManagerWebPart.Component, {
      context: this.context,
      listName: 'Documents'
    });

    ReactDOM.render(element, this.domElement);
  }

  static Component = ({ context, listName }) => {
    const handleDocumentSubmit = async (formData) => {
      try {
        // Upload to SharePoint document library
        const list = sp.web.lists.getByTitle(listName);
        
        // Upload file
        if (formData.file) {
          const fileBuffer = await formData.file.arrayBuffer();
          const uploadResult = await list.rootFolder.files.add(
            formData.file.name,
            fileBuffer,
            true
          );

          // Update file metadata
          const item = await uploadResult.file.getItem();
          await item.update({
            Title: formData.title,
            Description: formData.description,
            Status: formData.status
          });
        }

        alert('Document uploaded successfully!');
      } catch (error) {
        console.error('Error uploading document:', error);
        alert('Error uploading document. Check console for details.');
      }
    };

    return (
      <div className="document-manager-webpart">
        <h2>Job Sold Form</h2>
        <DocumentForm onSubmit={handleDocumentSubmit} />
      </div>
    );
  };
}