import React from "react";
import Modal from "../components/Modal";

interface PopupProps {
  open: boolean;
  onClose?: () => void;
}

const Popup: React.FC<PopupProps> = ({ open, onClose }) => (
  <Modal open={open} onClose={onClose}>
    <div className="bg-white rounded-xl p-8 min-w-[300px] flex flex-col items-center">
      <h2 className="text-black text-xl mb-4">Hello Popup!</h2>
      <button
        className="bg-yellow-400 rounded-full px-4 py-2 font-bold"
        onClick={onClose}
      >
        Close
      </button>
    </div>
  </Modal>
);

export default Popup;
