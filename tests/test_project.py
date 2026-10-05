import json
import tempfile
import unittest
from pathlib import Path

import train_local
import validate_dataset


class DatasetTests(unittest.TestCase):
    def make_dataset(self, records):
        root = Path(tempfile.mkdtemp())
        (root / "images" / "Creator").mkdir(parents=True)
        (root / "metadata.jsonl").write_text(
            "\n".join(json.dumps(record) for record in records), encoding="utf-8"
        )
        (root / "images" / "Creator" / "one.jpg").write_bytes(b"image")
        return root

    def test_nested_paths_and_captions(self):
        root = self.make_dataset([{"file_name": "images/Creator/one.jpg", "text": "caption"}])
        info = train_local.load_dataset(root)
        self.assertEqual(len(info.records), 1)

    def test_missing_image_is_rejected(self):
        root = self.make_dataset([{"file_name": "images/Creator/missing.png", "text": "caption"}])
        with self.assertRaises(ValueError):
            train_local.load_dataset(root)

    def test_empty_caption_is_rejected(self):
        root = self.make_dataset([{"file_name": "images/Creator/one.jpg", "text": " "}])
        with self.assertRaises(ValueError):
            train_local.load_dataset(root)

    def test_device_detection_returns_known_device(self):
        self.assertIn(train_local.detect_device()[0], {"cpu", "cuda"})

    def test_validator_passes(self):
        root = self.make_dataset([{"file_name": "images/Creator/one.jpg", "text": "caption"}])
        self.assertEqual(validate_dataset.validate(root), 0)


if __name__ == "__main__":
    unittest.main()
