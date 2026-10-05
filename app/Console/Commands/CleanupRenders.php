<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class CleanupRenders extends Command
{
    protected $signature   = 'renders:cleanup {--older-than=60 : Delete render temp dirs older than N minutes}';
    protected $description = 'Clean up temporary render directories in storage/app/tmp/renders/';

    public function handle(): int
    {
        $olderThan = (int) $this->option('older-than');
        $baseDir   = storage_path('app/tmp/renders');

        if (!is_dir($baseDir)) {
            $this->info('No tmp/renders directory — nothing to clean.');
            return 0;
        }

        $cutoff  = time() - ($olderThan * 60);
        $cleaned = 0;

        foreach (glob($baseDir . '/*', GLOB_ONLYDIR) as $dir) {
            if (filemtime($dir) < $cutoff) {
                $this->deleteDir($dir);
                $cleaned++;
            }
        }

        $this->info("Cleaned {$cleaned} render temp dir(s) older than {$olderThan} minutes.");
        return 0;
    }

    private function deleteDir(string $dir): void
    {
        foreach (glob($dir . '/*') as $file) {
            if (is_file($file)) @unlink($file);
        }
        @rmdir($dir);
    }
}
