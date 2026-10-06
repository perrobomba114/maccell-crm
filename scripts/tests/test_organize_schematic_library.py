import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('organizer', Path(__file__).parents[1] / 'organize-schematic-library.py')
organizer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(organizer)


class OrganizationTests(unittest.TestCase):
    def test_samsung_stays_under_brand_and_preserves_variant(self):
        family, brand, model, review = organizer.classify('Samsung/Samsung A03 core SM-A032F/Pdf/image.pdf')
        self.assertEqual((family, brand, model, review), ('pdf', 'Samsung', 'A03 core', False))
        self.assertNotEqual(model, organizer.classify('Samsung/Samsung A03s SM-A037/Pdf/image.pdf')[2])

    def test_apple_shared_board_not_single_device(self):
        result = organizer.classify('bulk/iPhone11pro&promax-boardview.pcbe')
        self.assertEqual(result[2], 'iPhone 11 Pro + Pro Max')

    def test_compact_apple_normalization_is_idempotent(self):
        for value in ['iPhone13ProMax', 'iPhone 13pro Max', 'iPhone 14_14Plus']:
            normalized = organizer.apple_model(value)
            self.assertEqual(organizer.apple_model(normalized), normalized)
        self.assertEqual(organizer.apple_model('iPhone13ProMax'), 'iPhone 13 Pro Max')
        self.assertEqual(organizer.apple_model('iPhone12_12Pro'), 'iPhone 12 + 12 Pro')
        self.assertEqual(organizer.apple_model('iPhone14 Pro_ProMAX'), 'iPhone 14 Pro + Pro Max')

    def test_laptop_switch_is_not_nintendo(self):
        result = organizer.classify('Consolas/Nintendo/Lenovo notebook switch problem.pdf')
        self.assertTrue(result[3])
        self.assertEqual(result[1], 'Laptop-PC/Por revisar')

    def test_unknown_board_remains_review(self):
        self.assertTrue(organizer.classify('Consolas/Xbox/toledo_soc.pcbe')[3])

    def test_model_labels_do_not_change_on_second_pass(self):
        cases = [('iPhone6sPlus', 'Apple'), ('iPhone 16E', 'Apple'),
                 ('Edge 5G', 'Motorola'), ('Moto g7 power XT1955-2', 'Motorola'),
                 ('Redmi k40pro', 'Xiaomi'), ('Note10 plus', 'Samsung')]
        for value, brand in cases:
            normalized = organizer.model_label(value, brand)
            self.assertEqual(organizer.model_label(normalized, brand), normalized)

    def test_hash_mismatch_never_publishes(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); source = root / 'original.pdf'; source.write_bytes(b'original')
            item = {'source': source.name, 'target': 'pdf/Brand/Model/new.pdf', 'size': 8,
                    'mtime_ns': source.stat().st_mtime_ns, 'sha256': '0' * 64}
            with self.assertRaises(ValueError): organizer.materialize(root, {'entries': [item]}, root / 'journal')
            self.assertFalse((root / item['target']).exists())
            self.assertEqual(source.read_bytes(), b'original')

    def test_collision_preserved_and_roundtrip(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); source = root / 'old.pdf'; source.write_bytes(b'%PDF-data')
            target = root / 'pdf/Brand/Model/new.pdf'; target.parent.mkdir(parents=True); target.write_bytes(b'other')
            item = {'source': source.name, 'target': str(target.relative_to(root)), 'size': source.stat().st_size,
                    'mtime_ns': source.stat().st_mtime_ns, 'sha256': organizer.digest(source)}
            with self.assertRaises(ValueError): organizer.materialize(root, {'entries': [item]}, root / 'journal')
            self.assertEqual(target.read_bytes(), b'other')
            item['target'] = 'pdf/Brand/Model/variant.pdf'
            manifest = {'entries': [item]}
            organizer.materialize(root, manifest, root / 'journal')
            organizer.commit(root, manifest)
            self.assertFalse(source.exists())
            organizer.rollback(root, manifest)
            self.assertEqual(source.read_bytes(), b'%PDF-data')

    def test_images_publish_beside_model_pdfs(self):
        for source in ['media/Apple/iPhone 13 Pro Max/connector.jpg',
                       'pdf/Apple/iPhone 13 Pro Max/connector.jpg']:
            row = {'path': source, 'size': 12, 'mtime_ns': 1}
            result = organizer.plan([row], {}, 'media-layout')['entries'][0]
            self.assertEqual(result['target'], 'pdf/Apple/iPhone 13 Pro Max/Connector.jpg')
            self.assertFalse(result['review'])

    def test_course_uploads_are_not_reorganized(self):
        result = organizer.plan([{'path': 'CURSO/Electronica/clase.mp4', 'size': 12}], {}, 'batch')
        self.assertEqual(result['entries'], [])

    def test_path_traversal_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            for bad in ['../outside', '/etc/passwd']:
                with self.assertRaises(ValueError): organizer.safe(Path(d), bad)


if __name__ == '__main__': unittest.main()
